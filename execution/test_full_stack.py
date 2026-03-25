import requests
import sys
import time

def verify_full_stack():
    print("🔍 Testing Full-Stack Integration...")
    
    # 1. Backend Health Check
    print("Testing Backend (3001)...", end=" ", flush=True)
    try:
        resp = requests.get("http://localhost:3001/health", timeout=3)
        if resp.status_code == 200:
            print("✅ OK")
        else:
            print(f"❌ ERROR (Status {resp.status_code})")
            return False
    except:
        print("❌ OFFLINE")
        return False

    # 2. Frontend Health Check
    print("Testing Frontend (5173)...", end=" ", flush=True)
    try:
        # Note: Vite server might return 200 for root
        resp = requests.get("http://localhost:5173", timeout=3)
        if resp.status_code == 200:
            print("✅ OK")
        else:
            print(f"❌ ERROR (Status {resp.status_code})")
            return False
    except:
        print("❌ OFFLINE")
        return False

    # 3. Functional Data Integrity Test
    print("Testing Recommendation Engine Logic...", end=" ", flush=True)
    try:
        # Check if recommendations are flowing from remote API -> MCP -> Backend
        resp = requests.get("http://localhost:3001/api/draft/recommend?enemy=kagura", timeout=5)
        data = resp.json()
        if "suggestions" in data and len(data["suggestions"]) > 0:
            print(f"✅ OK ({len(data['suggestions'])} candidates)")
        else:
            print("❌ DATA ERROR (No suggestions received)")
            return False
    except Exception as e:
        print(f"❌ DATA ERROR ({str(e)})")
        return False

    return True

if __name__ == "__main__":
    success = verify_full_stack()
    if success:
        print("\n✨ STATUS: High-Fidelity Draftboard is OPERATIONAL.")
    else:
        print("\n⚠️  STATUS: Integration check FAILED. Are the services running?")
        sys.exit(1)
