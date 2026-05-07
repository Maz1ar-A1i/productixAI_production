"""
Decision Agent — Ranked action queue and approval flow.
Uses act_engine to evaluate rules against context from earlier agents.
"""
from __future__ import annotations
from typing import Any, Dict, List
from ..engines.act_engine import evaluate_actions, DEFAULT_RULES


class DecisionAgent:
    """Produces a ranked action queue from pattern + prediction outputs."""

    def run(
        self,
        context: Dict[str, Any],
        extra_rules: List[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        context keys (passed from PatternAgent + PredictionAgent):
          stock_days_remaining   : float
          revenue_pct_change     : float  (negative = drop)
          opex_overrun_pct       : float
          machine_efficiency_pct : float
          top_segment_growth_pct : float
          (any other keys consumed by custom rules)

        Returns:
          {
            "actions_triggered": int,
            "priority_queue": [...],   # highest-score first
          }
        """
        rules = DEFAULT_RULES + (extra_rules or [])
        actions = evaluate_actions(rules, context)

        return {
            "actions_triggered": len(actions),
            "priority_queue": [
                {
                    "id":             a.id,
                    "action":         a.action,
                    "impact_summary": a.impact_summary,
                    "steps":          a.steps,
                    "autoable":       a.autoable,
                    "priority":       a.priority,
                    "score":          a.score,
                }
                for a in actions
            ],
        }
