"""
Act Engine — Rule evaluator and ranked action recommender.

Each action rule is:
  {
    "id":          "reorder_stock",
    "condition":   lambda ctx: ctx["stock_days"] < 2,
    "action":      "Reorder 800 units from best supplier",
    "impact":      {"revenue_recovery": 90000, "cost_saving": 0, "efficiency_gain": 0},
    "autoable":    True,
    "priority":    "high",
    "steps":       ["Generate PO", "Send to supplier", "Track ETA"],
  }
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional
import math


# ── Action scoring ────────────────────────────────────────────────────────────
PRIORITY_WEIGHTS = {"high": 3, "medium": 2, "low": 1}


def _score_action(impact: Dict[str, float], priority: str) -> float:
    """Compute a numeric score to rank actions."""
    revenue = impact.get("revenue_recovery", 0)
    savings = impact.get("cost_saving", 0)
    eff     = impact.get("efficiency_gain", 0)           # e.g. units saved * PKR value
    p_weight = PRIORITY_WEIGHTS.get(priority, 1)
    return (revenue + savings + eff) * p_weight


@dataclass
class ActionResult:
    id: str
    action: str
    impact_summary: str
    impact: Dict[str, float]
    steps: List[str]
    autoable: bool
    priority: str
    score: float
    triggered_by: str = "engine"


def evaluate_actions(
    rules: List[Dict[str, Any]],
    context: Dict[str, Any],
) -> List[ActionResult]:
    """
    Evaluate each rule against `context`.
    Returns a ranked list of triggered actions (highest score first).
    `rules` is a list of dicts; the 'condition' can be a callable or a string key
    in context that evaluates to True.
    """
    triggered: List[ActionResult] = []

    for rule in rules:
        # Evaluate condition
        condition = rule.get("condition")
        try:
            if callable(condition):
                fires = bool(condition(context))
            elif isinstance(condition, str):
                fires = bool(context.get(condition, False))
            elif condition is None:
                fires = True  # Unconditional rule
            else:
                fires = False
        except Exception:
            fires = False

        if not fires:
            continue

        impact = rule.get("impact", {})
        score  = _score_action(impact, rule.get("priority", "low"))

        # Build human-readable impact summary
        parts = []
        if impact.get("revenue_recovery"):
            parts.append(f"Revenue recovery: PKR {impact['revenue_recovery']:,.0f}")
        if impact.get("cost_saving"):
            parts.append(f"Cost saving: PKR {impact['cost_saving']:,.0f}")
        if impact.get("efficiency_gain"):
            parts.append(f"Efficiency gain: {impact['efficiency_gain']} units")
        impact_summary = " | ".join(parts) if parts else "Impact depends on execution speed"

        triggered.append(ActionResult(
            id=rule.get("id", "unknown"),
            action=rule.get("action", ""),
            impact_summary=impact_summary,
            impact=impact,
            steps=rule.get("steps", []),
            autoable=rule.get("autoable", False),
            priority=rule.get("priority", "low"),
            score=score,
            triggered_by=rule.get("triggered_by", "engine"),
        ))

    # Sort: high priority first, then by financial score
    triggered.sort(key=lambda a: (PRIORITY_WEIGHTS.get(a.priority, 0), a.score), reverse=True)
    return triggered


# ── Default rule registry (used by Feed and Domain engines) ──────────────────
DEFAULT_RULES: List[Dict[str, Any]] = [
    {
        "id": "low_stock_reorder",
        "condition": lambda ctx: ctx.get("stock_days_remaining", 99) < 2,
        "action": "Reorder 800 units from fastest supplier",
        "impact": {"revenue_recovery": 90000, "cost_saving": 0, "efficiency_gain": 0},
        "steps": ["Generate PO for 800 units", "Send to Supplier B (fastest delivery 3 days)", "Monitor stock ETA"],
        "autoable": True,
        "priority": "high",
    },
    {
        "id": "revenue_drop_followup",
        "condition": lambda ctx: ctx.get("revenue_pct_change", 0) < -10,
        "action": "Contact top 5 leads in pipeline immediately",
        "impact": {"revenue_recovery": 45000, "cost_saving": 0, "efficiency_gain": 0},
        "steps": ["Open CRM → filter 'Hot Lead'", "Call within next 2 hours", "Log outcome"],
        "autoable": True,
        "priority": "high",
    },
    {
        "id": "opex_overrun",
        "condition": lambda ctx: ctx.get("opex_overrun_pct", 0) > 8,
        "action": "Reduce diesel consumption — shift to grid during off-peak",
        "impact": {"revenue_recovery": 0, "cost_saving": 100000, "efficiency_gain": 0},
        "steps": ["Identify peak diesel hours", "Schedule grid shift 11pm–5am", "Review fuel contract"],
        "autoable": False,
        "priority": "medium",
    },
    {
        "id": "machine_efficiency_low",
        "condition": lambda ctx: ctx.get("machine_efficiency_pct", 100) < 75,
        "action": "Reassign senior operator to underperforming machine",
        "impact": {"revenue_recovery": 24000, "cost_saving": 0, "efficiency_gain": 80},
        "steps": ["Notify shift supervisor", "Swap operator assignment", "Monitor for 30 mins"],
        "autoable": False,
        "priority": "medium",
    },
    {
        "id": "growth_segment",
        "condition": lambda ctx: ctx.get("top_segment_growth_pct", 0) > 25,
        "action": "Increase marketing budget for fast-growing segment by 15%",
        "impact": {"revenue_recovery": 320000, "cost_saving": 0, "efficiency_gain": 0},
        "steps": ["Reallocate 15% from lower-growth segment", "Launch targeted campaign", "Track conversion"],
        "autoable": False,
        "priority": "low",
    },
]
