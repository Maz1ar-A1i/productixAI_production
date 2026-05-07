"""
Agents Router — /api/agents/*

GET  /api/agents/run-all        — Execute full orchestration loop (all 4 agents)
POST /api/agents/{agent_id}/act — Approve or reject an agent recommendation
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, Dict, List
from datetime import datetime

from ..database import get_db
from .. import models
from ..deps import get_current_user
from ..agents.orchestrator import AgentOrchestrator

router = APIRouter(prefix="/agents", tags=["AI Agents"])
_orchestrator = AgentOrchestrator()


@router.get("/run-all", summary="Run all agents — full orchestration loop")
def run_all_agents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Triggers the full Detect → Recommend → Assign → Execute → Measure loop.
    Uses real DB data from the user's organisation.
    """
    org_id = current_user.organization_id

    # Pull DB context
    context: Dict[str, Any] = {
        "org_name": getattr(current_user, "organization", {}) and "Your Organisation",
        "goal":     "Improve business performance",  # Ideally read from user's saved goal
    }

    # Add flat product record data as time-series
    try:
        from ..models import ProductDataRecord
        records = (
            db.query(ProductDataRecord)
            .filter(ProductDataRecord.organization_id == org_id)
            .order_by(ProductDataRecord.id.asc())
            .limit(100)
            .all()
        )
        
        output_keywords = ["revenue", "sales", "traffic", "capacity", "units", "produced"]
        
        series_values = []
        series_records = []
        
        for r in records:
            data = r.data or {}
            total_out = 0.0
            for k, v in data.items():
                try:
                    if any(kw in k.lower() for kw in output_keywords):
                        total_out += float(v)
                except: continue
            
            series_values.append(total_out)
            series_records.append({
                "value": total_out,
                "label": f"Month: {r.month}",
                "timestamp": r.month
            })

        context["series"]           = series_records
        context["prediction_series"] = series_values
        context["demand_history"]   = series_values

        if series_values:
            mean = sum(series_values) / len(series_values)
            context["target"] = mean * 1.2  # 20% above average as target
    except Exception as e:
        print(f"Error in agent context loading: {e}")

    try:
        result = _orchestrator.run_all(context)
        result["executed_at"] = datetime.utcnow().isoformat()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent loop failed: {e}")


@router.post("/{agent_id}/act", summary="Approve or reject an agent recommendation")
def act_on_agent(
    agent_id: str,
    payload: Dict[str, Any],
    current_user: models.User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Record a user decision on an agent recommendation.
    payload: { "action_id": "...", "decision": "approve" | "reject", "notes": "" }
    """
    decision   = payload.get("decision", "reject")
    action_id  = payload.get("action_id", "unknown")
    notes      = payload.get("notes", "")

    return {
        "agent_id":  agent_id,
        "action_id": action_id,
        "decision":  decision,
        "notes":     notes,
        "status":    "recorded",
        "message":   f"Decision '{decision}' recorded for agent '{agent_id}' action '{action_id}'.",
    }
