"""
KPI Engine — Computes KPI values from ProductDataRecord data.

Provides:
  • BUILT_IN_KPIS registry with compute functions
  • compute_kpi_value() — single KPI computation from data records
  • compute_all_kpis() — compute all active KPIs for an org, create snapshots
  • determine_status() — on_track | warning | critical health check
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session


# ═══════════════════════════════════════════════════════════════════════════════
# BUILT-IN KPI REGISTRY
# ═══════════════════════════════════════════════════════════════════════════════

def _safe_div(a: float, b: float, default: float = 0.0) -> float:
    """Safe division to avoid ZeroDivisionError."""
    return a / b if b and b != 0 else default


def _sum_matching_keys(data: Dict[str, Any], keywords: List[str]) -> float:
    """Sum numeric values from a dict where key matches any keyword (case-insensitive)."""
    total = 0.0
    for k, v in data.items():
        try:
            val = float(v)
            if any(kw in k.lower() for kw in keywords):
                total += val
        except (ValueError, TypeError):
            continue
    return total


def _get_float(data: Dict[str, Any], key: str, default: float = 0.0) -> float:
    """Get a float value from a dict, searching case-insensitively."""
    # Direct match
    if key in data:
        try:
            return float(data[key])
        except (ValueError, TypeError):
            pass
    # Case-insensitive
    key_lower = key.lower()
    for k, v in data.items():
        if k.lower() == key_lower:
            try:
                return float(v)
            except (ValueError, TypeError):
                pass
    return default


# ── Built-in KPI compute functions ────────────────────────────────────────────
# Each receives a flat dict of aggregated metrics and returns Optional[float].

def _get_opex(data: Dict[str, Any]) -> float:
    """
    Get Total OPEX. If not present or 0, fallback to Monthly OPEX/OPEX.
    If still 0/missing, sum up all individual expense components.
    """
    opex = _get_float(data, "Total OPEX")
    if opex > 0:
        return opex

    # Fallback to Monthly OPEX or OPEX
    opex = _get_float(data, "Monthly OPEX") or _get_float(data, "OPEX")
    if opex > 0:
        return opex

    # Fallback to summing up individual cost columns
    expense_keywords = ["cost", "expense", "rent", "maintenance", "fuel", "hr", "wapda", "opex"]
    total = 0.0
    for k, v in data.items():
        k_lower = k.lower()
        if k_lower in ("total opex", "monthly opex", "opex", "cost per kw"):
            continue
        if any(kw in k_lower for kw in expense_keywords):
            try:
                total += float(v)
            except (ValueError, TypeError):
                continue
    return total


def _get_revenue(data: Dict[str, Any]) -> float:
    """
    Get Total Revenue. If not present or 0, fallback to Monthly Revenue/Revenue/Daily Revenue.
    If still 0/missing, sum up all individual revenue components.
    """
    rev = _get_float(data, "Total Revenue")
    if rev > 0:
        return rev

    # Fallback to Monthly Revenue, Revenue, or Daily Revenue
    rev = _get_float(data, "Monthly Revenue") or _get_float(data, "Revenue") or _get_float(data, "Daily Revenue")
    if rev > 0:
        return rev

    # Fallback to summing up individual revenue columns
    total = 0.0
    for k, v in data.items():
        k_lower = k.lower()
        if k_lower in ("total revenue", "monthly revenue", "revenue", "daily revenue", "revenue per customer"):
            continue
        if "revenue" in k_lower or "sales" in k_lower:
            try:
                total += float(v)
            except (ValueError, TypeError):
                continue
    return total


def _capacity_utilization(data: Dict[str, Any]) -> Optional[float]:
    produced = _get_float(data, "KW Produced")
    capacity = _get_float(data, "Total Capacity (KW)")
    if capacity <= 0:
        return None
    return round((produced / capacity) * 100, 2)


def _customer_utilization(data: Dict[str, Any]) -> Optional[float]:
    attached = _get_float(data, "Attached Customers")
    max_cust = _get_float(data, "Max Customers")
    if max_cust <= 0:
        return None
    return round((attached / max_cust) * 100, 2)


def _cost_per_kw(data: Dict[str, Any]) -> Optional[float]:
    opex = _get_opex(data)
    produced = _get_float(data, "KW Produced")
    if produced <= 0:
        return None
    return round(opex / produced, 2)


def _profit_margin(data: Dict[str, Any]) -> Optional[float]:
    profit = _get_float(data, "Profit")
    revenue = _get_revenue(data)
    if revenue <= 0:
        return None
    if profit <= 0:
        opex = _get_opex(data)
        profit = revenue - opex
    return round((profit / revenue) * 100, 2)


def _revenue_per_customer(data: Dict[str, Any]) -> Optional[float]:
    revenue = _get_revenue(data)
    customers = _get_float(data, "Attached Customers")
    if customers <= 0:
        return None
    return round(revenue / customers, 2)


def _opex_ratio(data: Dict[str, Any]) -> Optional[float]:
    opex = _get_opex(data)
    revenue = _get_revenue(data)
    if revenue <= 0:
        return None
    return round((opex / revenue) * 100, 2)


def _idle_capacity(data: Dict[str, Any]) -> Optional[float]:
    capacity = _get_float(data, "Total Capacity (KW)")
    produced = _get_float(data, "KW Produced")
    if capacity <= 0:
        return None
    return round(capacity - produced, 2)


def _production_efficiency(data: Dict[str, Any]) -> Optional[float]:
    """Generic output/input ratio using keyword heuristics."""
    output_kw = ["revenue", "sales", "traffic", "capacity", "units", "produced", "sold", "profit"]
    input_kw = ["cost", "opex", "diesel", "grid", "elec", "fuel", "rent", "kwh", "liters", "hours", "maintenance"]
    total_out = _sum_matching_keys(data, output_kw)
    total_in = _sum_matching_keys(data, input_kw)
    if total_in <= 0:
        return None
    return round((total_out / total_in) * 100, 2)


def _kw_sold_ratio(data: Dict[str, Any]) -> Optional[float]:
    sold = _get_float(data, "KW Sold")
    produced = _get_float(data, "KW Produced")
    if produced <= 0:
        return None
    return round((sold / produced) * 100, 2)


def _daily_cost(data: Dict[str, Any]) -> Optional[float]:
    return _get_float(data, "Daily Cost") or None


# ── Registry ──────────────────────────────────────────────────────────────────

BUILT_IN_KPIS: Dict[str, Dict[str, Any]] = {
    "capacity_utilization": {
        "label": "Capacity Utilization",
        "description": "Percentage of total capacity that is actively producing",
        "compute": _capacity_utilization,
        "unit": "",
        "category": "operational",
        "higher_is_better": True,
        "default_target": 90.0,
        "default_warning": 75.0,
        "default_critical": 60.0,
    },
    "customer_utilization": {
        "label": "Customer Utilization",
        "description": "Percentage of maximum customer slots that are filled",
        "compute": _customer_utilization,
        "unit": "",
        "category": "operational",
        "higher_is_better": True,
        "default_target": 85.0,
        "default_warning": 65.0,
        "default_critical": 50.0,
    },
    "cost_per_kw": {
        "label": "Cost per KW",
        "description": "Total operational cost divided by KW produced",
        "compute": _cost_per_kw,
        "unit": "PKR",
        "category": "financial",
        "higher_is_better": False,
        "default_target": 2000.0,
        "default_warning": 2500.0,
        "default_critical": 3000.0,
    },
    "profit_margin": {
        "label": "Profit Margin %",
        "description": "Net profit as a percentage of total revenue",
        "compute": _profit_margin,
        "unit": "%",
        "category": "financial",
        "higher_is_better": True,
        "default_target": 40.0,
        "default_warning": 25.0,
        "default_critical": 15.0,
    },
    "revenue_per_customer": {
        "label": "Revenue per Customer",
        "description": "Average revenue generated per attached customer",
        "compute": _revenue_per_customer,
        "unit": "PKR",
        "category": "financial",
        "higher_is_better": True,
        "default_target": 50000.0,
        "default_warning": 30000.0,
        "default_critical": 15000.0,
    },
    "opex_ratio": {
        "label": "OPEX Ratio %",
        "description": "Operating expenses as a percentage of revenue (lower is better)",
        "compute": _opex_ratio,
        "unit": "%",
        "category": "financial",
        "higher_is_better": False,
        "default_target": 60.0,
        "default_warning": 75.0,
        "default_critical": 90.0,
    },
    "idle_capacity": {
        "label": "Idle Capacity (KW)",
        "description": "Unused production capacity in KW",
        "compute": _idle_capacity,
        "unit": "KW",
        "category": "operational",
        "higher_is_better": False,
        "default_target": 10.0,
        "default_warning": 30.0,
        "default_critical": 50.0,
    },
    "production_efficiency": {
        "label": "Production Efficiency %",
        "description": "Output value divided by input cost (higher is better)",
        "compute": _production_efficiency,
        "unit": "%",
        "category": "operational",
        "higher_is_better": True,
        "default_target": 120.0,
        "default_warning": 90.0,
        "default_critical": 70.0,
    },
    "kw_sold_ratio": {
        "label": "KW Sold / Produced %",
        "description": "Percentage of produced KW that was actually sold",
        "compute": _kw_sold_ratio,
        "unit": "%",
        "category": "operational",
        "higher_is_better": True,
        "default_target": 85.0,
        "default_warning": 65.0,
        "default_critical": 50.0,
    },
    "daily_cost": {
        "label": "Daily Operating Cost",
        "description": "Total daily operational cost",
        "compute": _daily_cost,
        "unit": "PKR",
        "category": "financial",
        "higher_is_better": False,
        "default_target": 5000.0,
        "default_warning": 7500.0,
        "default_critical": 10000.0,
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# STATUS & TREND
# ═══════════════════════════════════════════════════════════════════════════════

def determine_status(
    value: Optional[float],
    target: Optional[float],
    warning_threshold: Optional[float],
    critical_threshold: Optional[float],
    higher_is_better: bool = True,
) -> str:
    """
    Determine KPI health status: on_track | warning | critical | no_data.
    """
    if value is None:
        return "no_data"
    if target is None and warning_threshold is None and critical_threshold is None:
        return "on_track"

    if higher_is_better:
        # Higher is better: critical < warning < target
        if critical_threshold is not None and value <= float(critical_threshold):
            return "critical"
        if warning_threshold is not None and value <= float(warning_threshold):
            return "warning"
        return "on_track"
    else:
        # Lower is better: target < warning < critical
        if critical_threshold is not None and value >= float(critical_threshold):
            return "critical"
        if warning_threshold is not None and value >= float(warning_threshold):
            return "warning"
        return "on_track"


def compute_trend(current: Optional[float], previous: Optional[float]) -> Tuple[str, Optional[float]]:
    """
    Compute trend direction and percentage change.
    Returns (trend_str, change_pct).
    """
    if current is None or previous is None or previous == 0:
        return "stable", None

    change_pct = round(((current - previous) / abs(previous)) * 100, 2)
    if change_pct > 2.0:
        return "up", change_pct
    elif change_pct < -2.0:
        return "down", change_pct
    return "stable", change_pct


# ═══════════════════════════════════════════════════════════════════════════════
# KPI COMPUTATION
# ═══════════════════════════════════════════════════════════════════════════════

def _flatten_record_data(record_data: Dict[str, Any], column_mappings: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """
    Flatten a ProductDataRecord.data dict into a single-level dict.
    Handles both canonical (unit_data/customer_data) and legacy formats.
    """
    if not record_data:
        return {}

    from ..data_pipeline import parse_legacy_record

    normalised = parse_legacy_record(record_data) if "unit_data" not in record_data else record_data
    flat: Dict[str, Any] = {}

    # Unit-level metrics
    for k, v in normalised.get("unit_data", {}).items():
        flat[k] = v

    # Aggregate customer-level metrics
    for cust in normalised.get("customer_data", []):
        for k, v in cust.items():
            if k == "name":
                continue
            try:
                flat[k] = flat.get(k, 0.0) + float(v)
            except (ValueError, TypeError):
                pass

    # Computed fields
    for k, v in normalised.get("computed", {}).items():
        flat[k] = v

    # Reverse-map display names back to their canonical names
    if column_mappings:
        reverse_map = {v: k for k, v in column_mappings.items() if v}
        for display_name, canonical_name in reverse_map.items():
            if display_name in flat:
                flat[canonical_name] = flat[display_name]

    return flat


def aggregate_records(records: list, column_mappings: Optional[Dict[str, str]] = None) -> Dict[str, float]:
    """
    Aggregate multiple ProductDataRecord objects into a single flat metrics dict.
    Sums numeric values across all records.
    """
    aggregated: Dict[str, float] = {}
    count = 0

    for rec in records:
        data = rec.data if hasattr(rec, "data") else rec
        flat = _flatten_record_data(data, column_mappings)
        for k, v in flat.items():
            try:
                val = float(v)
                aggregated[k] = aggregated.get(k, 0.0) + val
            except (ValueError, TypeError):
                continue
        count += 1

    # Add count for average-based KPIs
    aggregated["_record_count"] = count
    return aggregated


def compute_kpi_value(
    kpi_def,
    data_records: list,
    db: Optional[Session] = None,
) -> Optional[float]:
    """
    Compute a single KPI's value from data records.

    For built_in KPIs: uses the BUILT_IN_KPIS registry.
    For formula KPIs: delegates to formula_engine.evaluate_expression.
    """
    # Fetch org column mappings if db is available
    mappings = {}
    if db:
        from ..models import Organization
        org = db.query(Organization).filter(Organization.id == kpi_def.organization_id).first()
        if org:
            mappings = org.column_mappings or {}

    if kpi_def.computation_type == "built_in":
        spec = BUILT_IN_KPIS.get(kpi_def.built_in_key)
        if not spec:
            return None
        aggregated = aggregate_records(data_records, mappings)
        return spec["compute"](aggregated)

    elif kpi_def.computation_type == "formula" and kpi_def.formula_id and db:
        from ..models import FormulaRecord
        formula = db.query(FormulaRecord).filter(
            FormulaRecord.id == kpi_def.formula_id,
            FormulaRecord.is_active == True,
        ).first()
        if not formula:
            return None

        from .formula_engine import evaluate_formula_on_dataset
        data_rows = []
        for rec in data_records:
            data = rec.data if hasattr(rec, "data") else rec
            data_rows.append(_flatten_record_data(data or {}, mappings))

        stats = evaluate_formula_on_dataset(
            formula.expression_string, data_rows, formula.output_type
        )
        return stats.get("result")

    return None


def compute_all_kpis(db: Session, organization_id: int) -> List[Dict[str, Any]]:
    """
    Compute all active KPIs for an organization and create snapshots.
    Returns a list of snapshot result dicts.
    """
    from ..models import KPIDefinition, KPISnapshot, ProductDataRecord

    kpis = db.query(KPIDefinition).filter(
        KPIDefinition.organization_id == organization_id,
        KPIDefinition.is_active == True,
    ).all()

    # Fetch data records for this org
    records_query = db.query(ProductDataRecord).filter(
        ProductDataRecord.organization_id == organization_id
    )

    # Determine current period
    now = datetime.utcnow()
    current_period = now.strftime("%Y-%m")

    results = []

    for kpi in kpis:
        # Filter records by product if KPI is scoped
        if kpi.product_id:
            kpi_records = records_query.filter(
                ProductDataRecord.product_id == kpi.product_id
            ).all()
        else:
            kpi_records = records_query.all()

        # Compute value
        value = compute_kpi_value(kpi, kpi_records, db)

        # Get previous snapshot for trend
        prev_snapshot = db.query(KPISnapshot).filter(
            KPISnapshot.kpi_id == kpi.id,
            KPISnapshot.period != current_period,
        ).order_by(KPISnapshot.computed_at.desc()).first()

        previous_value = float(prev_snapshot.value) if prev_snapshot and prev_snapshot.value is not None else None
        trend, change_pct = compute_trend(value, previous_value)

        # Determine status
        status = determine_status(
            value,
            float(kpi.target_value) if kpi.target_value is not None else None,
            float(kpi.warning_threshold) if kpi.warning_threshold is not None else None,
            float(kpi.critical_threshold) if kpi.critical_threshold is not None else None,
            kpi.higher_is_better,
        )

        # Check if snapshot for current period already exists — update or create
        existing = db.query(KPISnapshot).filter(
            KPISnapshot.kpi_id == kpi.id,
            KPISnapshot.period == current_period,
        ).first()

        if existing:
            existing.value = value
            existing.target_value = kpi.target_value
            existing.status = status
            existing.trend = trend
            existing.previous_value = previous_value
            existing.change_pct = change_pct
            existing.computed_at = datetime.utcnow()
            snapshot = existing
        else:
            snapshot = KPISnapshot(
                kpi_id=kpi.id,
                organization_id=organization_id,
                period=current_period,
                value=value,
                target_value=kpi.target_value,
                status=status,
                trend=trend,
                previous_value=previous_value,
                change_pct=change_pct,
            )
            db.add(snapshot)

        results.append({
            "kpi_id": kpi.id,
            "kpi_name": kpi.name,
            "period": current_period,
            "value": float(value) if value is not None else None,
            "target": float(kpi.target_value) if kpi.target_value is not None else None,
            "status": status,
            "trend": trend,
            "change_pct": change_pct,
        })

    db.commit()
    return results
