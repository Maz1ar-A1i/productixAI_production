from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas, deps
from ..database import get_db
from ..core_logic import perform_calculation, get_ai_analysis
from typing import Dict, Any

router = APIRouter(prefix="/productivity", tags=["Productivity"])

@router.post("/calculate", summary="Calculate Productivity Scores with AI Analysis")
def calculate_productivity_with_analysis(
    request: schemas.ProductivityCalculationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    try:
        # Step 1: Perform productivity calculation
        result = perform_calculation(request.inputs, request.outputs)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        # Step 2: Perform AI analysis on the same data
        ai_analysis_data = {
            "inputs": request.inputs,
            "outputs": request.outputs,
            "combined_productivity": result["combined_productivity"],
            "single_productivity": result["single_productivity"]
        }
        
        ai_result = get_ai_analysis(ai_analysis_data)
        
        # Step 3: Save only calculation in DB (original fields)
        calc = models.ProductivityCalculation(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            processed_inputs=request.inputs,
            processed_outputs=request.outputs,
            combined_productivity=result["combined_productivity"],
            single_productivity=result["single_productivity"]
        )
        
        db.add(calc)
        db.commit()
        db.refresh(calc)

        # Step 4: Combine both results for response
        combined_response = {
            "id": calc.id,
            "organization_id": calc.organization_id,
            "user_id": calc.user_id,
            "processed_inputs": calc.processed_inputs,
            "processed_outputs": calc.processed_outputs,
            "combined_productivity": calc.combined_productivity,
            "single_productivity": calc.single_productivity,
            "created_at": calc.created_at,
            # AI Analysis results
            "efficiency_score": ai_result.get("efficiency_score"),
            "ai_prediction": ai_result.get("ai_prediction"),
            "top_inefficiencies": ai_result.get("top_inefficiencies"),
            "ai_prescriptions": ai_result.get("ai_prescriptions")
        }
        
        return combined_response

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")