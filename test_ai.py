import requests
import json

# Replace with a valid token from your browser or logs if needed
# Better: just try to find a batch ID from the DB and hit the endpoint
BASE_URL = "http://127.0.0.1:8000"

def test_ai_analysis(batch_id, token):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(f"{BASE_URL}/batches/{batch_id}/ai_analysis", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # You need a valid token to run this.
    # For now, I'll just check if I can get some shift IDs from the DB directly to confirm data exists.
    pass
