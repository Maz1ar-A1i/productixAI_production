"""
Pattern Agent — Anomaly detection, variance analysis, trend identification.

Detects:
  • Z-score anomalies in numeric series
  • Variance spikes vs rolling baseline
  • Batch/shift performance clusters
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import math
import statistics


@dataclass
class PatternResult:
    anomalies: List[Dict[str, Any]] = field(default_factory=list)
    trends: List[Dict[str, Any]] = field(default_factory=list)
    summary: str = ""
    severity: str = "low"   # low | medium | high


def _zscore(values: List[float], value: float) -> float:
    if len(values) < 2:
        return 0.0
    mean = statistics.mean(values)
    std  = statistics.stdev(values)
    return (value - mean) / (std + 1e-9)


def detect_anomalies(
    series: List[Dict[str, Any]],
    key: str = "value",
    z_threshold: float = 2.0,
) -> PatternResult:
    """
    Run Z-score anomaly detection on a time-ordered series of records.
    Each record must have `key` (numeric) and optionally `label`, `timestamp`.
    """
    values = [float(r.get(key, 0)) for r in series]
    if not values:
        return PatternResult(summary="No data to analyse.")

    anomalies = []
    for i, (rec, val) in enumerate(zip(series, values)):
        z = _zscore(values, val)
        if abs(z) >= z_threshold:
            direction = "spike" if z > 0 else "dip"
            anomalies.append({
                "index":     i,
                "label":     rec.get("label", f"Record {i}"),
                "value":     val,
                "z_score":   round(z, 2),
                "direction": direction,
                "timestamp": rec.get("timestamp", ""),
            })

    # Simple trend detection (slope sign of last 5 points)
    trends = []
    window = min(5, len(values))
    if window >= 2:
        recent = values[-window:]
        slope = (recent[-1] - recent[0]) / window
        pct   = (slope / (abs(statistics.mean(recent)) + 1e-9)) * 100
        direction = "up" if slope > 0 else "down"
        trends.append({
            "period":    f"Last {window} periods",
            "direction": direction,
            "change_pct": round(pct, 2),
        })

    severity_map = {0: "low", 1: "medium"}
    severity = "high" if len(anomalies) >= 2 else severity_map.get(len(anomalies), "low")

    summary_parts = [f"{len(anomalies)} anomaly(s) detected."]
    if trends:
        t = trends[0]
        summary_parts.append(f"Trend: {t['direction']} ({t['change_pct']:+.1f}% over last {window} periods).")

    return PatternResult(
        anomalies=anomalies,
        trends=trends,
        summary=" ".join(summary_parts),
        severity=severity,
    )


class PatternAgent:
    """Wraps anomaly detection logic for the orchestrator."""

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        context keys:
          series  : List[{value, label?, timestamp?}]
          key     : field name (default "value")
          z_thresh: z-score threshold (default 2.0)
        """
        series    = context.get("series", [])
        key       = context.get("key", "value")
        z_thresh  = float(context.get("z_thresh", 2.0))

        result = detect_anomalies(series, key, z_thresh)
        return {
            "anomalies":  result.anomalies,
            "trends":     result.trends,
            "summary":    result.summary,
            "severity":   result.severity,
        }
