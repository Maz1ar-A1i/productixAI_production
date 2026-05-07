import os
from dotenv import load_dotenv
load_dotenv()

from app.core_logic import get_ai_agent_report

def test_agent():
    print("Testing Groq AI Agent Report...")
    mock_records = {
        "Product A": [
            {
                "calculation_id": 1,
                "date": "2024-04-09",
                "inputs": {"Labor": 100},
                "outputs": {"Output": 50},
                "combined_productivity": "0.50",
                "single_productivity": {"Labor": "0.50"}
            }
        ]
    }
    goal = "Reduce labor costs and increase output"
    
    try:
        res = get_ai_agent_report(mock_records, goal)
        print("\nAPI Response keys:", res.keys())
        if "error" in res:
            print("FAIL:", res["error"])
        else:
            print("SUCCESS: Plan and report generated.")
            print("\nPLAN PREVIEW:", res["plan"][:100], "...")
    except Exception as e:
        print("CRASH:", e)

if __name__ == "__main__":
    test_agent()
