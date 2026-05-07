"""
Prediction Agent — Future gap forecasting, demand signals, risk probability.
Uses the shared predict_engine under the hood.
"""
from __future__ import annotations
from typing import Any, Dict, List
from ..engines.predict_engine import linear_regression_predict, demand_forecast, gap_analysis


class PredictionAgent:
    """Wraps predict_engine for the orchestrator."""

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        context keys:
          series          : List[float]  — ordered historical values
          target          : float        — monthly/shift target
          horizon         : int          — periods to forecast (default 7)
          horizon_label   : str          — human label (default "7 days")
          demand_history  : List[float]  — for demand forecast
        """
        series         = context.get("series", [])
        target         = context.get("target")
        horizon        = int(context.get("horizon", 7))
        horizon_label  = context.get("horizon_label", f"{horizon} periods")
        demand_history = context.get("demand_history", series)

        results: Dict[str, Any] = {}

        if series:
            pred = linear_regression_predict(series, horizon, horizon_label)
            results["forecast"] = {
                "predicted_value": pred.predicted_value,
                "confidence_pct":  pred.confidence_pct,
                "r_squared":       pred.r_squared,
                "trend":           pred.trend_direction,
                "lower_bound":     pred.lower_bound,
                "upper_bound":     pred.upper_bound,
                "horizon":         pred.horizon,
                "message":         pred.message,
            }

        if target and series:
            latest = series[-1]
            results["gap"] = gap_analysis(latest, target)

        if demand_history:
            results["demand"] = demand_forecast(demand_history, horizon_days=horizon)

        # Risk probability (heuristic based on trend + confidence)
        if "forecast" in results:
            f = results["forecast"]
            risk = "high" if f["trend"] == "down" and f["confidence_pct"] > 75 else \
                   "medium" if f["trend"] == "down" else "low"
            results["risk"] = risk

        return results
