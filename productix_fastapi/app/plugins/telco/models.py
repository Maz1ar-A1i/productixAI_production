"""
Telco ML Models
===============
• revenue_predict  — LinearRegression on revenue series
• opex_predict     — LinearRegression on OPEX series
• productivity_classify — RandomForest / threshold bucket for productivity class
"""
from __future__ import annotations
from typing import Any, Dict, List
from ...engines.predict_engine import linear_regression_predict, classify_performance


def revenue_predict(revenue_series: List[float], horizon_days: int = 30) -> Dict[str, Any]:
    """
    Predict tower revenue for the next `horizon_days` days.
    `revenue_series` should be a list of monthly/daily revenue figures (oldest first).
    """
    result = linear_regression_predict(
        series=revenue_series,
        horizon=horizon_days,
        horizon_label=f"{horizon_days} days",
    )
    return {
        "predicted_revenue":  result.predicted_value,
        "confidence_pct":     result.confidence_pct,
        "r_squared":          result.r_squared,
        "trend":              result.trend_direction,
        "lower_bound":        result.lower_bound,
        "upper_bound":        result.upper_bound,
        "message":            result.message,
        "horizon":            result.horizon,
    }


def opex_predict(opex_series: List[float], horizon_days: int = 30) -> Dict[str, Any]:
    """
    Predict OPEX for the next `horizon_days` days.
    """
    result = linear_regression_predict(
        series=opex_series,
        horizon=horizon_days,
        horizon_label=f"{horizon_days} days",
    )
    return {
        "predicted_opex":   result.predicted_value,
        "confidence_pct":   result.confidence_pct,
        "r_squared":        result.r_squared,
        "trend":            result.trend_direction,
        "lower_bound":      result.lower_bound,
        "upper_bound":      result.upper_bound,
        "message":          result.message,
        "horizon":          result.horizon,
    }


def productivity_classify(
    productivity_score: float,
    high_threshold: float = 0.7,
    low_threshold:  float = 0.4,
) -> Dict[str, Any]:
    """
    Classify a tower's productivity score into High / Medium / Low.

    Uses RandomForestClassifier if sklearn is available;
    otherwise falls back to threshold-based classification.
    """
    bucket = classify_performance(productivity_score, high_threshold, low_threshold)

    recommendations = {
        "High":   "Tower is performing optimally. Maintain current configuration.",
        "Medium": "Moderate performance. Review energy mix and traffic shaping policies.",
        "Low":    "Underperforming tower. Investigate diesel costs, utilization, and SLA compliance.",
    }

    return {
        "productivity_score": productivity_score,
        "classification":     bucket,
        "high_threshold":     high_threshold,
        "low_threshold":      low_threshold,
        "recommendation":     recommendations[bucket],
    }
