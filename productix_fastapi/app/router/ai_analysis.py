from fastapi import APIRouter, Depends, HTTPException
from ..core_logic import get_ai_analysis, ai_analysis_for_record
from sqlalchemy.orm import Session
from .. import models, schemas, deps
from ..database import get_db

router = APIRouter(prefix="/ai", tags=["AI Analysis"])

@router.post("/analyze", summary="Get Structured AI Analysis", response_model=schemas.AIAnalysisResponse)
def analyze_calculation(
    request: schemas.AIAnalysisCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    # Perform AI analysis
    result = get_ai_analysis(request.dict())
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    # Save output in DB
    analysis = models.AIAnalysis(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        request_data=request.dict(),
        efficiency_score=result.get("efficiency_score"),
        ai_prediction=result.get("ai_prediction"),
        top_inefficiencies=result.get("top_inefficiencies"),
        ai_prescriptions=result.get("ai_prescriptions")
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis

@router.get("/analyze-record/{record_id}", summary="Analyze a flat data record")
def analyze_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    record = db.query(models.ProductDataRecord).filter(
        models.ProductDataRecord.id == record_id,
        models.ProductDataRecord.organization_id == current_user.organization_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    if current_user.role.value == "org_user":
        assignment = db.query(models.UserProductAssignment).filter(
            models.UserProductAssignment.user_id == current_user.id,
            models.UserProductAssignment.product_id == record.product_id
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="You do not have access to this unit's analysis.")

    result = ai_analysis_for_record(record)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return {
        "record_id": record_id,
        "month": record.month,
        "analysis": result
    }