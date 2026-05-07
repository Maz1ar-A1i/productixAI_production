import os
import io
import json
import pandas as pd
from datetime import date, datetime
from sqlalchemy.orm import Session
from productix_fastapi.app.database import SessionLocal, engine
from productix_fastapi.app import models

def test_logic():
    print("Testing upload logic locally...")
    db = SessionLocal()
    
    # Mock user / organization
    org = db.query(models.Organization).first()
    if not org:
        print("❌ No organization found in DB. Run create_admin.py first.")
        return
    
    class MockUser:
        def __init__(self, org_id):
            self.organization_id = org_id
    
    user = MockUser(org.id)
    
    file_path = "sample_retail_data.xlsx"
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return

    try:
        with open(file_path, "rb") as f:
            contents = f.read()
            df_dict = pd.read_excel(io.BytesIO(contents), sheet_name=None)
            
        expected_sheets = ["Products", "Batches", "ShiftEntries"]
        for sheet in expected_sheets:
            if sheet not in df_dict:
                print(f"❌ Missing sheet: {sheet}")
                return

        # Helper for date parsing
        def parse_date(val):
            if not val or pd.isna(val) or val == "": return None
            try:
                if hasattr(val, "date"): return val.date()
                return pd.to_datetime(val).date()
            except: return None

        # Helper for JSON parsing
        def parse_json(val):
            if not val or pd.isna(val) or val == "": return {}
            if isinstance(val, (dict, list)): return val
            try:
                return json.loads(val)
            except: return {}

        # Step 2: Upload Products
        products_df = df_dict["Products"].fillna("")
        product_map = {}
        existing_products = db.query(models.Product).filter_by(organization_id=user.organization_id).all()
        for p in existing_products:
            product_map[p.name.strip().lower()] = p

        for _, row in products_df.iterrows():
            if not row.get("name"): continue
            name_norm = str(row["name"]).strip().lower()
            
            input_fields = parse_json(row.get("input_fields", "[]"))
            output_fields = parse_json(row.get("output_fields", "[]"))

            product = product_map.get(name_norm)
            if product:
                product.description = str(row.get("description", product.description))
                product.input_fields = input_fields
                product.output_fields = output_fields
            else:
                product = models.Product(
                    name=str(row["name"]).strip(),
                    description=str(row.get("description", "")),
                    input_fields=input_fields,
                    output_fields=output_fields,
                    organization_id=user.organization_id
                )
                db.add(product)
                db.flush()
                product_map[name_norm] = product
        db.commit()
        print("✅ Products processed.")

        # Step 3: Upload Batches
        batches_df = df_dict["Batches"].fillna("")
        batch_map = {}
        for _, row in batches_df.iterrows():
            if not row.get("batch_number") or not row.get("product_name"): continue
            prod_name_norm = str(row["product_name"]).strip().lower()
            product = product_map.get(prod_name_norm)
            if not product: continue

            batch_number = str(row["batch_number"]).strip()
            batch = db.query(models.Batch).filter_by(batch_number=batch_number, organization_id=user.organization_id).first()
            
            start_date = parse_date(row.get("start_date")) or date.today()
            end_date = parse_date(row.get("end_date"))
            status = str(row.get("status", "open")).lower()

            if batch:
                batch.start_date = start_date
                batch.end_date = end_date
                batch.status = status
                batch.product_id = product.id
            else:
                batch = models.Batch(
                    organization_id=user.organization_id, product_id=product.id,
                    batch_number=batch_number, start_date=start_date, end_date=end_date, status=status
                )
                db.add(batch)
                db.flush()
            batch_map[batch_number] = batch
        db.commit()
        print("✅ Batches processed.")

        # Step 4: Upload Shift Entries
        shifts_df = df_dict["ShiftEntries"].fillna("")
        for _, row in shifts_df.iterrows():
            batch_num = str(row.get("batch_number", "")).strip()
            if not batch_num: continue
            batch = batch_map.get(batch_num) or db.query(models.Batch).filter_by(batch_number=batch_num, organization_id=user.organization_id).first()
            if not batch: continue

            shift_date = parse_date(row.get("date")) or date.today()
            shift_no = str(row.get("shift_no", "Morning"))
            input_materials = parse_json(row.get("input_materials"))
            output_products = parse_json(row.get("output_products"))

            shift = db.query(models.ShiftEntry).filter_by(batch_id=batch.id, date=shift_date, shift_no=shift_no, organization_id=user.organization_id).first()
            if shift:
                shift.input_materials = input_materials
                shift.output_products = output_products
                shift.admin_notes = str(row.get("admin_notes", ""))
            else:
                shift = models.ShiftEntry(
                    batch_id=batch.id, organization_id=user.organization_id,
                    date=shift_date, shift_no=shift_no, input_materials=input_materials,
                    output_products=output_products, admin_notes=str(row.get("admin_notes", ""))
                )
                db.add(shift)
        db.commit()
        print("✅ ShiftEntries processed.")
        print("🎉 ALL GOOD!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_logic()
