"""
Telco KPI Definitions
=====================
KPIs computed per tower record:
  • revenue_per_tower   (PKR / month)
  • productivity_score  (revenue / OPEX ratio)
  • energy_efficiency   (revenue / kWh)
  • utilization_pct     (traffic_gb / capacity_gb)
  • opex_per_tower      (PKR / month)
  • diesel_share_pct    (diesel_kwh / total_kwh * 100)
"""
from __future__ import annotations
from typing import Any, Dict, List


def compute_kpis(towers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Aggregate KPIs across a list of tower records.

    Expected tower dict keys (all floats):
      revenue, opex, diesel_kwh, grid_kwh, traffic_gb, capacity_gb, productivity_score
    """
    if not towers:
        return {}

    n = len(towers)

    total_revenue       = sum(t.get("revenue", 0) for t in towers)
    total_opex          = sum(t.get("opex", 0) for t in towers)
    total_diesel        = sum(t.get("diesel_kwh", 0) for t in towers)
    total_grid          = sum(t.get("grid_kwh", 0) for t in towers)
    total_energy        = total_diesel + total_grid
    total_traffic       = sum(t.get("traffic_gb", 0) for t in towers)
    total_capacity      = sum(t.get("capacity_gb", 1) for t in towers)
    avg_productivity    = sum(t.get("productivity_score", 0) for t in towers) / n

    return {
        "towers_analysed":     n,
        "total_revenue_pkr":   round(total_revenue, 2),
        "total_opex_pkr":      round(total_opex, 2),
        "net_margin_pkr":      round(total_revenue - total_opex, 2),
        "avg_revenue_per_tower": round(total_revenue / n, 2),
        "avg_opex_per_tower":    round(total_opex / n, 2),
        "avg_productivity":      round(avg_productivity, 4),
        "energy_efficiency":     round(total_revenue / max(total_energy, 1), 4),
        "utilization_pct":       round((total_traffic / max(total_capacity, 1)) * 100, 2),
        "diesel_share_pct":      round((total_diesel / max(total_energy, 1)) * 100, 2),
        "total_diesel_kwh":      round(total_diesel, 2),
        "total_grid_kwh":        round(total_grid, 2),
    }


def compute_chart_data(towers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Return data for the five standard Telco charts."""

    scatter_cost_revenue = [
        {"x": t.get("opex", 0), "y": t.get("revenue", 0), "id": t.get("tower_id", f"T{i}")}
        for i, t in enumerate(towers)
    ]
    scatter_energy_revenue = [
        {"x": t.get("diesel_kwh", 0) + t.get("grid_kwh", 0), "y": t.get("revenue", 0), "id": t.get("tower_id", f"T{i}")}
        for i, t in enumerate(towers)
    ]
    scatter_util_revenue = [
        {"x": round((t.get("traffic_gb", 0) / max(t.get("capacity_gb", 1), 1)) * 100, 1),
         "y": t.get("revenue", 0), "id": t.get("tower_id", f"T{i}")}
        for i, t in enumerate(towers)
    ]

    total_diesel = sum(t.get("diesel_kwh", 0) for t in towers)
    total_grid   = sum(t.get("grid_kwh", 0) for t in towers)
    pie_energy = [
        {"name": "Diesel", "value": round(total_diesel, 2)},
        {"name": "Grid",   "value": round(total_grid, 2)},
    ]

    bar_opex = [
        {"tower_id": t.get("tower_id", f"T{i}"),
         "opex": t.get("opex", 0),
         "revenue": t.get("revenue", 0)}
        for i, t in enumerate(towers[:15])   # show top 15 towers
    ]

    return {
        "scatter_cost_revenue":   scatter_cost_revenue,
        "scatter_energy_revenue": scatter_energy_revenue,
        "scatter_util_revenue":   scatter_util_revenue,
        "pie_energy_split":       pie_energy,
        "bar_opex_breakdown":     bar_opex,
    }
