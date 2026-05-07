import traceback
import os
from dotenv import load_dotenv
load_dotenv()

from app.core_logic import get_ai_analysis

def test_analysis():
    print("Testing Groq AI Analysis...")
    try:
        res = get_ai_analysis({
            'combined_productivity': 'Productivity = 0.50',
            'targeted_productivity': '0.60',
            'standard_productivity': '0.55',
            'inputs': {'Labor': 100},
            'outputs': {'Shoes': 50},
            'single_productivity': {'Labor / Shoes': '0.50'}
        })
        print("\nAPI Response:")
        print(res)
        
        if "error" in res:
            print(f"\nFAIL: {res['error']}")
        else:
            print("\nSUCCESS: Analysis generated.")
            
    except Exception as e:
        print(f"\nCRASH: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_analysis()
