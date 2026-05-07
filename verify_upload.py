import requests
import os

BASE_URL = "http://localhost:8000"  # Assuming backend runs on 8000
EMAIL = "admin@productix.com"
PASSWORD = "AdminPassword123!"

def test_upload():
    # 1. Login
    print("Logging in...")
    try:
        login_response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": EMAIL,
            "password": PASSWORD
        })
        login_response.raise_for_status()
        token = login_response.json()["access_token"]
        print("✅ Login successful!")
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return

    # 2. Upload
    file_path = "sample_retail_data.xlsx"
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return

    print(f"Uploading {file_path}...")
    try:
        with open(file_path, "rb") as f:
            files = {"file": (file_path, f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
            headers = {"Authorization": f"Bearer {token}"}
            upload_response = requests.post(f"{BASE_URL}/api/v1/uploads/excel", files=files, headers=headers)
        
        if upload_response.status_code == 200:
            print("✅ Upload successful!")
            print(upload_response.json())
        else:
            print(f"❌ Upload failed with status {upload_response.status_code}")
            print(upload_response.json())
    except Exception as e:
        print(f"❌ Upload request failed: {e}")

if __name__ == "__main__":
    test_upload()
