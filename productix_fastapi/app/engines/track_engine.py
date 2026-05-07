"""
Track Engine — Universal KPI computation layer.

Accepts raw event records and normalizes them into a universal schema,
then computes: productivity ratio, efficiency score, cost_per_unit, utilization %.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime
import math


@dataclass
class TrackRecord:
    entity: str                          # "machine_A" | "sales_team_1" | "tower_KHI_001"
    timestamp: datetime
    input: float                         # Resources consumed  (hours, kg, PKR, kWh)
    output: float                        # Value produced      (units, PKR revenue, kWh)
    cost: float                          # Total cost incurred (PKR)
    resource: str = "units"             # Unit label
    performance: Optional[float] = None  # Target / benchmark (100 = 100 units target)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TrackResult:
    entity: str
    timestamp: datetime
    productivity_ratio: float    # output / input  (higher = better)
    efficiency_score: float      # (output / performance) * 100 if performance else None
    cost_per_unit: float         # cost / output
    utilization_pct: float       # (input_used / max_capacity) * 100
    trend: str                   # "up" | "down" | "stable"
    gap_to_target: float         # output - performance (negative = shortfall)
    raw: TrackRecord


def compute_track(record: TrackRecord, capacity: float = 1.0) -> TrackResult:
    """
    Normalise a single raw record into a TrackResult.
    `capacity` is the maximum possible input (e.g. 8-hr shift max hours).
    """
    output = max(record.output, 0.001)   # avoid div-by-zero
    inp    = max(record.input,  0.001)
    cost   = max(record.cost,   0.001)

    productivity_ratio = output / inp
    efficiency_score   = (output / record.performance * 100) if record.performance else 0.0
    cost_per_unit      = cost / output
    utilization_pct    = min((inp / max(capacity, 0.001)) * 100, 100.0)
    gap_to_target      = (output - record.performance) if record.performance else 0.0

    # Determine trend direction
    prev_ratio = record.metadata.get("prev_productivity_ratio")
    if prev_ratio is None:
        trend = "stable"
    elif productivity_ratio > prev_ratio * 1.02:
        trend = "up"
    elif productivity_ratio < prev_ratio * 0.98:
        trend = "down"
    else:
        trend = "stable"

    return TrackResult(
        entity=record.entity,
        timestamp=record.timestamp,
        productivity_ratio=round(productivity_ratio, 4),
        efficiency_score=round(efficiency_score, 2),
        cost_per_unit=round(cost_per_unit, 4),
        utilization_pct=round(utilization_pct, 2),
        trend=trend,
        gap_to_target=round(gap_to_target, 2),
        raw=record,
    )


def batch_track(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Accept a list of raw dicts, return list of serialised TrackResult dicts.
    Used by the /api/feed and /api/plugins/* endpoints.
    """
    results = []
    for r in records:
        try:
            rec = TrackRecord(
                entity=r.get("entity", "unknown"),
                timestamp=datetime.fromisoformat(r.get("timestamp", datetime.utcnow().isoformat())),
                input=float(r.get("input", 1)),
                output=float(r.get("output", 0)),
                cost=float(r.get("cost", 0)),
                resource=r.get("resource", "units"),
                performance=float(r["performance"]) if r.get("performance") else None,
                metadata=r.get("metadata", {}),
            )
            result = compute_track(rec, capacity=float(r.get("capacity", rec.input)))
            results.append({
                "entity":             result.entity,
                "timestamp":          result.timestamp.isoformat(),
                "productivity_ratio": result.productivity_ratio,
                "efficiency_score":   result.efficiency_score,
                "cost_per_unit":      result.cost_per_unit,
                "utilization_pct":    result.utilization_pct,
                "trend":              result.trend,
                "gap_to_target":      result.gap_to_target,
            })
        except Exception as e:
            results.append({"entity": r.get("entity", "?"), "error": str(e)})
    return results
