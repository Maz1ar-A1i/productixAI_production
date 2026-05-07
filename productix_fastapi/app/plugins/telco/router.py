"""
Telco Plugin Router — /api/plugins/telco/*

Track Tab:
  GET  /api/plugins/telco/kpis          — aggregated KPIs
  GET  /api/plugins/telco/charts        — 5 chart datasets
  POST /api/plugins/telco/upload        — CSV/XLSX tower data upload

Predict Tab:
  POST /api/plugins/telco/predict/revenue
  POST /api/plugins/telco/predict/opex
  POST /api/plugins/telco/predict/productivity-class

Act Tab:
  POST /api/plugins/telco/actions       — evaluate and return ranked actions
  POST /api/plugins/telco/chat          — AI chat (reuses chatbot infrastructure)
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Any, Dict, List, Optional
import json
import random

from ...database import get_db
from ... import models
from ...deps import get_current_user
from .kpis import compute_kpis, compute_chart_data
from .models import revenue_predict, opex_predict, productivity_classify
from .actions import TELCO_RULES
from ...engines.act_engine import evaluate_actions

router = APIRouter(prefix="/plugins/telco", tags=["Telco Plugin"])


# ── Demo data (used when no uploaded data is available) ───────────────────────
def _get_real_towers(db: Session, org_id: int) -> List[Dict[str, Any]]:
    """Fetches real production data and maps it to the Telco schema."""
    products = db.query(models.Product).filter(
        models.Product.organization_id == org_id,
        models.Product.sector == "Telecom"
    ).all()
    
    if not products:
        return []

    towers = []
    for product in products:
        # Aggregate data from ProductDataRecord for this product
        records = db.query(models.ProductDataRecord).filter(
            models.ProductDataRecord.product_id == product.id,
            models.ProductDataRecord.organization_id == org_id
        ).all()
        
        if not records:
            continue
            
        total_revenue = 0.0
        total_opex = 0.0
        diesel_kwh = 0.0
        grid_kwh = 0.0
        traffic_gb = 0.0
        capacity_gb = 0.0
        
        for r in records:
            data_dict = r.data or {}
            for k, v in data_dict.items():
                try:
                    val = float(v)
                    k_lower = k.lower()
                    
                    if "revenue" in k_lower: total_revenue += val
                    elif "traffic" in k_lower: traffic_gb += val
                    elif "capacity" in k_lower: capacity_gb += val
                    elif "diesel" in k_lower: 
                        diesel_kwh += val
                        total_opex += val # Add to opex as well
                    elif "grid" in k_lower or "elec" in k_lower: 
                        grid_kwh += val
                        total_opex += val
                    elif any(kw in k_lower for kw in ["cost", "opex", "rent", "maintenance"]):
                        total_opex += val
                except Exception:
                    continue
                
        towers.append({
            "tower_id": product.name,
            "location": product.description or "N/A",
            "revenue": round(total_revenue, 2),
            "opex": round(total_opex, 2),
            "diesel_kwh": round(diesel_kwh, 2),
            "grid_kwh": round(grid_kwh, 2),
            "traffic_gb": round(traffic_gb, 2),
            "capacity_gb": round(capacity_gb, 2),
            "productivity_score": round(total_revenue / max(total_opex, 1), 4),
        })
    return towers


# ── Track Tab ─────────────────────────────────────────────────────────────────

@router.get("/kpis", summary="Aggregated Telco KPIs")
def get_telco_kpis(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return aggregated KPIs across all tower data."""
    towers = _get_real_towers(db, current_user.organization_id)
    if not towers:
        towers = _get_demo_towers() # Fallback if no real data
    kpis = compute_kpis(towers)
    return {"kpis": kpis, "towers_preview": towers[:5]}


@router.get("/charts", summary="Telco chart data")
def get_telco_charts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return all 5 chart datasets."""
    towers = _get_real_towers(db, current_user.organization_id)
    if not towers:
        towers = _get_demo_towers()
    return compute_chart_data(towers)

def _get_demo_towers():
    """Fallback demo data."""
    import random as rnd
    rnd.seed(42)
    towers = []
    for i in range(10):
        towers.append({
            "tower_id": f"DEMO-{i}", "location": "DemoCity", 
            "revenue": 100000, "opex": 50000, "diesel_kwh": 500, "grid_kwh": 300,
            "traffic_gb": 100, "capacity_gb": 200, "productivity_score": 0.8
        })
    return towers


# ── Predict Tab ───────────────────────────────────────────────────────────────

@router.post("/predict/revenue", summary="Revenue prediction (Linear Regression)")
def predict_revenue(
    payload: Dict[str, Any],
    current_user: models.User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Predict revenue for the next N days.

    Request body:
      { "revenue_series": [100000, 105000, ...], "horizon_days": 30 }
    """
    series  = payload.get("revenue_series", [])
    horizon = int(payload.get("horizon_days", 30))
    if not series:
        # Use demo series if none provided
        series = [t["revenue"] for t in _demo_towers()]
    return revenue_predict(series, horizon)


@router.post("/predict/opex", summary="OPEX prediction (Linear Regression)")
def predict_opex(
    payload: Dict[str, Any],
    current_user: models.User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Predict OPEX for the next N days.

    Request body:
      { "opex_series": [40000, 42000, ...], "horizon_days": 30 }
    """
    series  = payload.get("opex_series", [])
    horizon = int(payload.get("horizon_days", 30))
    if not series:
        series = [t["opex"] for t in _demo_towers()]
    return opex_predict(series, horizon)


@router.post("/predict/productivity-class", summary="Productivity classification")
def predict_productivity_class(
    payload: Dict[str, Any],
    current_user: models.User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Classify a tower's productivity score into High / Medium / Low.

    Request body:
      { "productivity_score": 0.65, "high_threshold": 0.7, "low_threshold": 0.4 }
    """
    score = float(payload.get("productivity_score", 0.5))
    high  = float(payload.get("high_threshold", 0.7))
    low   = float(payload.get("low_threshold", 0.4))
    return productivity_classify(score, high, low)


# ── Act Tab ───────────────────────────────────────────────────────────────────

@router.post("/actions", summary="Evaluate and rank Telco actions")
def evaluate_telco_actions(
    payload: Dict[str, Any],
    current_user: models.User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Evaluate Telco action rules against the provided context.

    Request body example:
      {
        "diesel_share_pct": 68,
        "utilization_pct": 35,
        "opex_overrun_pct": 12,
        "grid_availability_pct": 55
      }
    """
    context = payload  # use entire payload as context dict
    actions = evaluate_actions(TELCO_RULES, context)
    return {
        "actions_triggered": len(actions),
        "actions": [
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


@router.post("/chat", summary="AI chat for Telco context")
def telco_chat(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    AI chat interface with Telco tower context injected.
    Reuses the existing RAG/Gemini chatbot infrastructure.
    """
    from ...router.chatbot import get_rag_chatbot_response

    query = payload.get("query", "")
    if not query:
        raise HTTPException(status_code=400, detail="Query is required.")

    towers = _demo_towers()
    kpis   = compute_kpis(towers)

    context = {
        "sector":       "Telecom",
        "kpis":         kpis,
        "towers_count": len(towers),
        "sample_towers": towers[:5],
    }

    result = get_rag_chatbot_response(context, query)
    return {"query": query, "response": result.get("response") or result.get("error", "No response")}
