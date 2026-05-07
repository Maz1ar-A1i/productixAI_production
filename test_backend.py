import requests
import sqlite3
import os

print("--- Productix Backend Diagnostic ---")

# 1. Check Backend Port
backend_url = "http://127.0.0.1:8000"
try:
    print(f"[*] Checking {backend_url}/docs...")
    r = requests.get(f"{backend_url}/docs", timeout=5)
    print(f"[+] Backend is UP (Status: {r.status_code})")
except Exception as e:
    print(f"[!] Backend is DOWN or HANGING: {e}")

# 2. Check Database File
db_path = "productix_fastapi/productix.db"
if os.path.exists(db_path):
    print(f"[+] Database file found at {db_path} ({os.path.getsize(db_path)} bytes)")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"[+] Database is readable. Tables found: {len(tables)}")
        
        # Check users
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print(f"[+] Users in database: {user_count}")
        conn.close()
    except Exception as e:
        print(f"[!] Database error: {e}")
else:
    print(f"[!] Database file NOT found at {db_path}")

# 3. Check for Malformed .env
env_path = "productix_fastapi/.env"
if os.path.exists(env_path):
    print(f"[*] Checking {env_path}...")
    with open(env_path, 'r') as f:
        lines = f.readlines()
        for i, line in enumerate(lines):
            if line.strip() and "=" not in line and not line.startswith("#"):
                print(f"[!] MALFORMED LINE in .env (Line {i+1}): {line.strip()}")
else:
    print(f"[!] .env file NOT found at {env_path}")

print("--- End of Diagnostic ---")
