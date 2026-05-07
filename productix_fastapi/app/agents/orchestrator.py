"""
Agent Orchestrator — Detect → Recommend → Assign → Execute → Measure loop.

Chains: PatternAgent → PredictionAgent → DecisionAgent → ReportsAgent
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional

from .pattern_agent import PatternAgent
from .prediction_agent import PredictionAgent
from .decision_agent import DecisionAgent
from .reports_agent import ReportsAgent


class AgentOrchestrator:
    """
    Run the full 4-agent chain and return a unified result dict.
    """

    def __init__(self):
        self.pattern_agent    = PatternAgent()
        self.prediction_agent = PredictionAgent()
        self.decision_agent   = DecisionAgent()
        self.reports_agent    = ReportsAgent()

    def run_all(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        context keys (all optional — engine works with partial data):
          series              : List[{value, label?, timestamp?}]
          prediction_series   : List[float]
          target              : float
          horizon             : int
          demand_history      : List[float]
          stock_days_remaining: float
          revenue_pct_change  : float
          opex_overrun_pct    : float
          machine_efficiency_pct: float
          top_segment_growth_pct: float
          goal                : str
          org_name            : str
          extra_rules         : List[dict]

        Returns:
          {
            "pattern":    {...},
            "prediction": {...},
            "decisions":  {...},
            "report":     {...},
            "status":     "ok"
          }
        """
        # ── Step 1: Pattern detection ──────────────────────────────────────
        pattern_result = self.pattern_agent.run(context)

        # ── Step 2: Prediction ────────────────────────────────────────────
        pred_ctx = {
            "series":         context.get("prediction_series") or context.get("series_values", []),
            "target":         context.get("target"),
            "horizon":        context.get("horizon", 7),
            "demand_history": context.get("demand_history", []),
        }
        prediction_result = self.prediction_agent.run(pred_ctx)

        # ── Step 3: Decision ──────────────────────────────────────────────
        decision_ctx = {**context}  # pass full context so all rules can fire
        # Enrich from prediction result
        if "forecast" in prediction_result and "gap" in prediction_result:
            gap = prediction_result["gap"]
            if gap.get("status") == "behind":
                pct = abs(gap.get("gap_pct", 0))
                decision_ctx.setdefault("revenue_pct_change", -pct)

        decision_result = self.decision_agent.run(
            decision_ctx,
            extra_rules=context.get("extra_rules", []),
        )

        # ── Step 4: Report generation ─────────────────────────────────────
        report_ctx = {
            "goal":              context.get("goal", "Improve business performance"),
            "org_name":          context.get("org_name", "Your Organization"),
            "pattern_result":    pattern_result,
            "prediction_result": prediction_result,
            "decision_result":   decision_result,
        }
        report_result = self.reports_agent.run(report_ctx)

        return {
            "pattern":    pattern_result,
            "prediction": prediction_result,
            "decisions":  decision_result,
            "report":     report_result,
            "status":     "ok",
        }
