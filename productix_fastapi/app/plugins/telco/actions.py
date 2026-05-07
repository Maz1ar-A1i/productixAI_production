"""
Telco Actions — action rules for the Telco sector.

These are passed to `act_engine.evaluate_actions()`.
"""
from __future__ import annotations
from typing import Any, Dict, List

TELCO_RULES: List[Dict[str, Any]] = [
    {
        "id": "solar_battery",
        "condition": lambda ctx: ctx.get("diesel_share_pct", 0) > 60,
        "action": "Install solar + battery storage at high-diesel towers",
        "impact": {
            "revenue_recovery": 0,
            "cost_saving":      180000,   # PKR / month
            "efficiency_gain":  0,
        },
        "steps": [
            "Identify top 10 towers by diesel share",
            "Request solar-battery RFQ from 3 vendors",
            "Present ROI analysis to management",
            "Deploy pilot at highest-cost tower",
        ],
        "autoable": False,
        "priority": "high",
        "triggered_by": "telco_engine",
    },
    {
        "id": "colocation",
        "condition": lambda ctx: ctx.get("utilization_pct", 100) < 40,
        "action": "Offer colocation capacity to competing operators",
        "impact": {
            "revenue_recovery": 250000,
            "cost_saving":      0,
            "efficiency_gain":  0,
        },
        "steps": [
            "Identify towers below 40% utilization",
            "Calculate spare capacity available per tower",
            "Issue colocation RFP to regional operators",
            "Set SLA terms and backhaul agreements",
        ],
        "autoable": False,
        "priority": "medium",
        "triggered_by": "telco_engine",
    },
    {
        "id": "sla_renegotiation",
        "condition": lambda ctx: ctx.get("opex_overrun_pct", 0) > 10,
        "action": "Renegotiate diesel + maintenance SLAs on high-OPEX towers",
        "impact": {
            "revenue_recovery": 0,
            "cost_saving":      120000,
            "efficiency_gain":  0,
        },
        "steps": [
            "Flag top 20% OPEX towers",
            "Pull historical vendor invoices",
            "Benchmark against industry rates",
            "Initiate renegotiation with vendors",
        ],
        "autoable": False,
        "priority": "medium",
        "triggered_by": "telco_engine",
    },
    {
        "id": "load_shedding_shift",
        "condition": lambda ctx: ctx.get("grid_availability_pct", 100) < 60,
        "action": "Shift non-critical workloads to grid off-peak windows",
        "impact": {
            "revenue_recovery": 0,
            "cost_saving":      60000,
            "efficiency_gain":  0,
        },
        "steps": [
            "Map grid availability windows per region",
            "Re-schedule batch processes to 11pm–5am",
            "Configure battery dispatch rules",
        ],
        "autoable": True,
        "priority": "low",
        "triggered_by": "telco_engine",
    },
]
