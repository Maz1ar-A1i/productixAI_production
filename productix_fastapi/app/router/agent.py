from fastapi import APIRouter, Depends, HTTPException
from ..core_logic import get_ai_agent_report
from sqlalchemy.orm import Session
from typing import List, Dict
from .. import models, schemas, deps
from ..database import get_db
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from fastapi.responses import FileResponse
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4

router = APIRouter(prefix="/agent", tags=["AI Agent"])

@router.post("/", summary="Run AI Agent for Reporting", response_model=schemas.AIReportResponse)
def run_ai_agent(
    request: schemas.AgentRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    records_dict = request.records  # Already a dict keyed by product_name

    # Generate AI report
    try:
        result = get_ai_agent_report(records_dict, request.goal)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Backend crash: {str(e)}")

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    from fastapi.encoders import jsonable_encoder

    # Save report in DB
    records_serializable = jsonable_encoder(records_dict)
    report = models.AIReport(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        goal=request.goal,
        plan=result.get("plan", ""),
        report=result.get("report", ""),
        records_used=records_serializable
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Return response
    return schemas.AIReportResponse(
        id=report.id,
        organization_id=report.organization_id,
        user_id=report.user_id,
        records_used=report.records_used,
        goal=report.goal,
        plan={"text": report.plan},
        report={"text": report.report},
        created_at=report.created_at.isoformat()
    )
    
    
    
@router.get("/{report_id}/download", summary="Download AI Report as PDF")
def download_ai_report(report_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    print("✅ Download endpoint hit:", report_id, current_user.id)

    report = db.query(models.AIReport).filter_by(id=report_id, user_id=current_user.id).first()
    if not report:
        print("❌ Report not found")
        raise HTTPException(status_code=404, detail="Report not found")

    # --- create PDF file path safely
    import os, tempfile
    tmp_dir = tempfile.gettempdir()
    file_path = os.path.join(tmp_dir, f"AI_Report_{report.id}.pdf")
    print("📄 Writing file:", file_path)


    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(file_path, pagesize=A4)
    story = []

    story.append(Paragraph(f"<b>AI Report for Goal:</b> {report.goal}", styles["Heading2"]))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"<b>Generated on:</b> {report.created_at.strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]))
    story.append(Spacer(1, 12))
    story.append(Paragraph("<b>Plan:</b>", styles["Heading3"]))
    story.append(Paragraph(report.plan.replace("\n", "<br/>"), styles["Normal"]))
    story.append(Spacer(1, 12))
    story.append(Paragraph("<b>Report:</b>", styles["Heading3"]))
    story.append(Paragraph(report.report.replace("\n", "<br/>"), styles["Normal"]))

    doc.build(story)
    print("✅ PDF built successfully")

    return FileResponse(
        path=file_path,
        filename=f"AI_Report_{report.id}.pdf",
        media_type="application/pdf"
    )
