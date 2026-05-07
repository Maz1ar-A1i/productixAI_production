"""
Predict Engine — Time-series forecasting and gap analysis.

Provides:
  • linear_regression_predict  — revenue / OPEX / any numeric series
  • demand_forecast            — Prophet-style rolling demand window
  • classify_performance       — High / Medium / Low bucket (threshold-based)
  • gap_analysis               — actual vs target delta with confidence
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import math
import statistics

try:
    import numpy as np
    from sklearn.linear_model import LinearRegression
    _SKLEARN = True
except ImportError:
    _SKLEARN = False

try:
    from prophet import Prophet
    import pandas as pd
    _PROPHET = True
except ImportError:
    _PROPHET = False


# ── Simple linear regression fallback (pure-Python) ────────────────────────
def _simple_linear_regression(x: List[float], y: List[float]) -> Tuple[float, float]:
    n = len(x)
    if n < 2:
        return (0.0, y[-1] if y else 0.0)
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    num = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
    den = sum((xi - mean_x) ** 2 for xi in x)
    slope = num / (den + 1e-9)
    intercept = mean_y - slope * mean_x
    return slope, intercept


def _r_squared(y_true: List[float], y_pred: List[float]) -> float:
    if len(y_true) < 2:
        return 0.0
    mean_y = sum(y_true) / len(y_true)
    ss_tot = sum((y - mean_y) ** 2 for y in y_true) + 1e-9
    ss_res = sum((yt - yp) ** 2 for yt, yp in zip(y_true, y_pred))
    return max(0.0, 1 - ss_res / ss_tot)


# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class PredictResult:
    predicted_value: float
    confidence_pct: float        # 0–100
    r_squared: float             # 0–1 (model fit quality)
    horizon: str                 # "1 day" | "1 week" | etc.
    trend_direction: str         # "up" | "down" | "stable"
    lower_bound: float
    upper_bound: float
    message: str


def linear_regression_predict(
    series: List[float],
    horizon: int = 1,
    horizon_label: str = "1 day",
) -> PredictResult:
    """
    Fit a simple linear regression on the provided numeric series and
    predict `horizon` steps ahead.
    `series` should be ordered oldest → newest.
    """
    if len(series) < 2:
        val = series[0] if series else 0.0
        return PredictResult(
            predicted_value=val, confidence_pct=50.0, r_squared=0.0,
            horizon=horizon_label, trend_direction="stable",
            lower_bound=val * 0.9, upper_bound=val * 1.1,
            message="Insufficient data for robust prediction.",
        )

    x = list(range(len(series)))

    if _SKLEARN:
        mdl = LinearRegression()
        mdl.fit([[xi] for xi in x], series)
        y_pred_in = [mdl.predict([[xi]])[0] for xi in x]
        slope = float(mdl.coef_[0])
        predicted = float(mdl.predict([[len(series) + horizon - 1]])[0])
    else:
        slope, intercept = _simple_linear_regression(x, series)
        predicted = slope * (len(series) + horizon - 1) + intercept
        y_pred_in = [slope * xi + intercept for xi in x]

    r2 = _r_squared(series, y_pred_in)
    confidence = round(min(max(r2 * 90 + 10, 45), 97), 1)

    # Standard deviation–based bands
    residuals = [a - p for a, p in zip(series, y_pred_in)]
    std = statistics.stdev(residuals) if len(residuals) > 1 else abs(predicted * 0.05)
    lower = predicted - 1.5 * std
    upper = predicted + 1.5 * std

    if slope > 0.01 * (abs(statistics.mean(series)) + 1e-9):
        trend = "up"
    elif slope < -0.01 * (abs(statistics.mean(series)) + 1e-9):
        trend = "down"
    else:
        trend = "stable"

    msg_map = {"up": "Trend is upward.", "down": "Declining trend detected.", "stable": "Trend is steady."}
    return PredictResult(
        predicted_value=round(predicted, 2),
        confidence_pct=confidence,
        r_squared=round(r2, 4),
        horizon=horizon_label,
        trend_direction=trend,
        lower_bound=round(lower, 2),
        upper_bound=round(upper, 2),
        message=msg_map[trend],
    )


def demand_forecast(
    historical_demand: List[float],
    horizon_days: int = 7,
) -> Dict[str, Any]:
    """
    Rolling-average demand forecast with safety-stock inclusion.
    Falls back to Prophet if installed.
    """
    if len(historical_demand) < 2:
        avg = historical_demand[0] if historical_demand else 0.0
        return {"forecast": [avg] * horizon_days, "avg_daily": avg, "method": "constant"}

    # Prophet path
    if _PROPHET:
        try:
            start = datetime.utcnow() - timedelta(days=len(historical_demand))
            dates = [start + timedelta(days=i) for i in range(len(historical_demand))]
            df = pd.DataFrame({"ds": [d.strftime("%Y-%m-%d") for d in dates], "y": historical_demand})
            m = Prophet(yearly_seasonality=False, weekly_seasonality=True, daily_seasonality=False)
            m.fit(df)
            future = m.make_future_dataframe(periods=horizon_days)
            fc = m.predict(future)
            tail = fc.tail(horizon_days)["yhat"].tolist()
            return {"forecast": [round(v, 2) for v in tail], "avg_daily": round(sum(tail) / len(tail), 2), "method": "prophet"}
        except Exception:
            pass

    # Weighted moving average (pure-Python fallback)
    window = min(14, len(historical_demand))
    recent = historical_demand[-window:]
    weights = list(range(1, window + 1))
    wma = sum(v * w for v, w in zip(recent, weights)) / sum(weights)
    forecast = [round(wma, 2)] * horizon_days
    return {"forecast": forecast, "avg_daily": round(wma, 2), "method": "wma"}


def classify_performance(value: float, high_thresh: float, low_thresh: float) -> str:
    """Return 'High' | 'Medium' | 'Low' bucket."""
    if value >= high_thresh:
        return "High"
    elif value >= low_thresh:
        return "Medium"
    return "Low"


def gap_analysis(actual: float, target: float) -> Dict[str, Any]:
    """Return gap magnitude, direction, and % deviation."""
    gap = actual - target
    pct = (gap / (abs(target) + 1e-9)) * 100
    return {
        "actual": actual,
        "target": target,
        "gap": round(gap, 2),
        "gap_pct": round(pct, 2),
        "status": "on_track" if gap >= 0 else "behind",
    }
