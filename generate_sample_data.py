import pandas as pd
import json
from datetime import date, timedelta

# 1. Create Products Data
products = pd.DataFrame([
    {
        "name": "Organic Cotton Tee",
        "description": "Premium 100% organic cotton t-shirt",
        "input_fields": json.dumps(["Raw Cotton", "Dye", "Water"]),
        "output_fields": json.dumps(["Finished Good", "Scrap"])
    },
    {
        "name": "Leather Chelsea Boot",
        "description": "Handcrafted leather boots",
        "input_fields": json.dumps(["Leather Hide", "Rubber Sole", "Thread"]),
        "output_fields": json.dumps(["Finished Good", "Quality Reject"])
    }
])

# 2. Create Batches Data
batches = pd.DataFrame([
    {
        "product_name": "Organic Cotton Tee",
        "batch_number": "BATCH-RT-001",
        "start_date": date.today().isoformat(),
        "end_date": (date.today() + timedelta(days=7)).isoformat(),
        "status": "open"
    },
    {
        "product_name": "Leather Chelsea Boot",
        "batch_number": "BATCH-RT-002",
        "start_date": date.today().isoformat(),
        "end_date": (date.today() + timedelta(days=10)).isoformat(),
        "status": "open"
    }
])

# 3. Create ShiftEntries Data (Randomized but logical)
shifts = []
# 5 days of shifts for Batch 1
for i in range(5):
    d = (date.today() - timedelta(days=i)).isoformat()
    shifts.append({
        "batch_number": "BATCH-RT-001",
        "date": d,
        "shift_no": "Morning",
        "input_materials": json.dumps({
            "Raw Cotton": {"amount": 50 + i, "unit_price": 2.5},
            "Dye": {"amount": 5, "unit_price": 10.0}
        }),
        "output_products": json.dumps({
            "Finished Good": {"amount": 45 + i},
            "Scrap": {"amount": 2}
        }),
        "admin_notes": "Consistent production quality." if i % 2 == 0 else "Minor machine recalibration."
    })

# 3 days of shifts for Batch 2
for i in range(3):
    d = (date.today() - timedelta(days=i)).isoformat()
    shifts.append({
        "batch_number": "BATCH-RT-002",
        "date": d,
        "shift_no": "Evening",
        "input_materials": json.dumps({
            "Leather Hide": {"amount": 20, "unit_price": 50.0},
            "Rubber Sole": {"amount": 20, "unit_price": 15.0}
        }),
        "output_products": json.dumps({
            "Finished Good": {"amount": 18},
            "Quality Reject": {"amount": 2}
        }),
        "admin_notes": "High precision required for leather cutting."
    })

shift_entries = pd.DataFrame(shifts)

# 4. Save to Excel with multiple sheets
with pd.ExcelWriter("sample_retail_data.xlsx", engine="openpyxl") as writer:
    products.to_excel(writer, sheet_name="Products", index=False)
    batches.to_excel(writer, sheet_name="Batches", index=False)
    shift_entries.to_excel(writer, sheet_name="ShiftEntries", index=False)

print("✅ sample_retail_data.xlsx generated successfully!")
