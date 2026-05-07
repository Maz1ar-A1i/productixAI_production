import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def get_token():
    # Attempt to login as admin
    login_data = {"email": "admin@productix.com", "password": "AdminPassword123!"}
    res = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if res.status_code == 200:
        return res.json()["access_token"]
    else:
        print(f"❌ Login failed: {res.text}")
        return None

def verify():
    token = get_token()
    if not token: return
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Verify Analytics
    print("\n--- Verifying Analytics ---")
    res = requests.get(f"{BASE_URL}/analytics/productivity-records", headers=headers)
    if res.status_code == 200:
        data = res.json()
        print(f"✅ Analytics fetched successfully. Products found: {list(data.keys())}")
        # Check if first product has records with non-null productivity
        for prod, records in data.items():
            if records:
                print(f"   Sample record for {prod}: Combined Productivity = {records[0].get('combined_productivity')}")
    else:
        print(f"❌ Analytics failed: {res.status_code} - {res.text}")

    # 2. Verify AI Agent
    print("\n--- Verifying AI Agent ---")
    # Fetch data first
    res = requests.get(f"{BASE_URL}/analytics/productivity-records", headers=headers)
    records = res.json()
    
    agent_payload = {
        "records": records,
        "goal": "Explain the productivity trends for my products."
    }
    
    res = requests.post(f"{BASE_URL}/agent/", headers=headers, json=agent_payload)
    if res.status_code == 200:
        report = res.json()
        print(f"✅ AI Agent report generated! ID: {report['id']}")
        print(f"   Goal: {report['goal']}")
        print(f"   Plan snippet: {report['plan']['text'][:100]}...")
    else:
        print(f"❌ AI Agent failed: {res.status_code} - {res.text}")

if __name__ == "__main__":
    verify()
