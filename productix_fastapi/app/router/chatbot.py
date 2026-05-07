import re
import json
from typing import Optional, Dict, Any, List
from datetime import date
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException
from ..database import get_db
from .. import models, schemas
from ..deps import get_current_user
from ..core_logic import get_rag_chatbot_response as core_rag_response

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# Utility for formatting DB values
def _fmt(v):
    if v is None:
        return "N/A"
    if isinstance(v, (date,)):
        return v.isoformat()
    return str(v)

def detect_intent(query: str) -> Dict[str, Any]:
    """Lightweight intent detection."""
    q = query.lower()
    
    # Specific product list request (e.g. "list all products")
    if re.search(r"\b(list|show)\b.*\bproducts\b", q):
        return {"entity_type": "product", "identifier": None}

    # product name lookup (e.g. "info on product ABC")
    m = re.search(r"product\s+(?:named|is)?\s*([a-z0-9_\- ]+)", q)
    if m:
        return {"entity_type": "product", "identifier": m.group(1).strip()}

    # Recent records request
    if re.search(r"\b(show|list)\b.*\b(records|data)\b", q):
        return {"entity_type": "record", "identifier": None}

    # Analytics intent
    if any(tok in q for tok in ["highest", "lowest", "average", "max", "min", "which product"]):
        return {"entity_type": "analytics", "identifier": None}

    return {"entity_type": "unknown", "identifier": None}

def answer_product(db, org_id: int, identifier: Optional[str]) -> Optional[str]:
    if identifier:
        products = db.query(models.Product).filter(
            models.Product.organization_id == org_id,
            models.Product.name.ilike(f"%{identifier}%")
        ).all()
    else:
        products = db.query(models.Product).filter(models.Product.organization_id == org_id).all()

    if not products: return None
    lines = ["🧩 Products:"]
    for p in products:
        lines.append(f"- {p.name} | Sector: {p.sector or 'N/A'} | Description: {p.description or 'N/A'}")
    return "\n".join(lines)

def answer_record(db, org_id: int) -> Optional[str]:
    records = (
        db.query(models.ProductDataRecord)
        .filter(models.ProductDataRecord.organization_id == org_id)
        .order_by(models.ProductDataRecord.created_at.desc())
        .limit(10)
        .all()
    )
    if not records: return None
    lines = ["📊 Recent Data Records:"]
    for r in records:
        product_name = r.product.name if r.product else r.product_id
        lines.append(f"- {r.month} | Product: {product_name} | Data: {json.dumps(r.data)}")
    return "\n".join(lines)

def run_analytics(db, org_id: int, query: str) -> Optional[str]:
    q = query.lower()
    if any(tok in q for tok in ["highest output", "max output", "which product had highest"]):
        records = db.query(models.ProductDataRecord).filter(models.ProductDataRecord.organization_id == org_id).all()
        prod_sums = {}
        for r in records:
            p_name = r.product.name if r.product else str(r.product_id)
            total = 0.0
            found = False
            if r.data:
                if "tenants" in r.data and isinstance(r.data["tenants"], list):
                    for t in r.data["tenants"]:
                        for k, v in t.get("outputs", {}).items():
                            try:
                                total += float(v)
                                found = True
                            except: pass
                else:
                    for k, v in r.data.items():
                        try:
                            if any(kw in k.lower() for kw in ["revenue", "sales", "traffic", "capacity", "units", "produced"]):
                                total += float(v)
                                found = True
                        except: continue
            if found:
                prod_sums[p_name] = prod_sums.get(p_name, 0.0) + total
        
        if not prod_sums: return "No output data found."
        best_p = max(prod_sums.items(), key=lambda x: x[1])
        return f"Product with highest output: {best_p[0]} ({best_p[1]} units/revenue)"
    return None

import enum

def serialize_model(obj):
    """Helper to convert SQLAlchemy model to dict, handling dates, enums, and Decimals."""
    data = {}
    for k, v in obj.__dict__.items():
        if not k.startswith("_sa_"):
            if isinstance(v, (date, datetime)):
                data[k] = v.isoformat()
            elif isinstance(v, enum.Enum):
                data[k] = v.value
            elif hasattr(v, '__dict__'): # Skip complex objects/relationships
                continue
            else:
                try:
                    json.dumps(v) # Test serializability
                    data[k] = v
                except:
                    data[k] = str(v)
    return data

@router.post("/rag", response_model=schemas.ChatbotResponse)
def chatbot_query(payload: Dict[str, Any], db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    query = payload.get("query")
    history = payload.get("history", [])
    
    if not query:
        raise HTTPException(status_code=400, detail="Query is required.")

    org_id = current_user.organization_id

    try:
        # 1) Direct DB Intent Handling (only for simple queries without history)
        intent = detect_intent(query)
        db_answer = None
        if not history:
            if intent["entity_type"] == "product":
                db_answer = answer_product(db, org_id, intent.get("identifier"))
            elif intent["entity_type"] == "record":
                db_answer = answer_record(db, org_id)
            elif intent["entity_type"] == "analytics":
                db_answer = run_analytics(db, org_id, query)

        if db_answer:
            history_record = models.ChatbotHistory(
                organization_id=org_id, user_id=current_user.id,
                query=query, response=db_answer
            )
            db.add(history_record)
            db.commit()
            return {"query": query, "response": db_answer}

        # 2) RAG Fallback with History
        products = db.query(models.Product).filter(models.Product.organization_id == org_id).limit(10).all()
        records = db.query(models.ProductDataRecord).filter(models.ProductDataRecord.organization_id == org_id).order_by(models.ProductDataRecord.created_at.desc()).limit(15).all()

        context_data = {
            "products": [serialize_model(p) for p in products],
            "data_records": [serialize_model(r) for r in records],
        }

        # Call RAG logic with history
        rag_result = core_rag_response(context_data, query, history=history)
        
        if "error" in rag_result:
             return {"query": query, "response": f"AI Error: {rag_result['error']}"}

        rag_text = rag_result.get("response", "No response generated.")

        # Save to history
        new_history = models.ChatbotHistory(
            organization_id=org_id, user_id=current_user.id,
            query=query, response=rag_text, records=context_data
        )
        db.add(new_history)
        db.commit()

        return {"query": query, "response": rag_text}

    except Exception as e:
        import traceback
        traceback.print_exc()
        # Return a valid ChatbotResponse even on error to avoid 500s
        return {"query": query, "response": f"System Error: {str(e)}"}
