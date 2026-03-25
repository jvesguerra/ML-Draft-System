import requests
import time
import subprocess
import os
import sys

BASE_URL = "http://localhost:3001/api/draft"

def check_health():
    try:
        resp = requests.get("http://localhost:3001/health", timeout=2)
        return resp.status_code == 200
    except:
        return False

def test_api():
    print("🚀 Starting Phase 3: Backend API Integration Test...")
    
    if not check_health():
        print("⚠️  Backend server (localhost:3001) is not running.")
        print("💡 Suggestion: Run 'cd backend && npm install && npm start' in a separate terminal.")
        return False

    # Test 1: Recommendation Engine
    print("\nTest 1: GET /api/draft/recommend?enemy=layla")
    try:
        r1 = requests.get(f"{BASE_URL}/recommend?enemy=layla")
        r1.raise_for_status()
        data = r1.json()
        suggestions = data.get("suggestions", [])
        print(f"✅ Received {len(suggestions)} suggestions.")
        if len(suggestions) > 0:
            top = suggestions[0]['hero']
            print(f"🔥 Top Counter Found: {top['name']} ({top['hero_id']})")
    except Exception as e:
        print(f"❌ Recommendation Test Failed: {e}")
        return False

    # Test 2: Composition Scoring
    print("\nTest 2: GET /api/draft/composition?allied=kagura,atlas")
    try:
        r2 = requests.get(f"{BASE_URL}/composition?allied=kagura,atlas")
        r2.raise_for_status()
        comp = r2.json()
        print(f"✅ Composition Score: {comp.get('total')}/100")
        for flag in comp.get('flags', []):
            print(f"🚩 Flag: {flag}")
    except Exception as e:
        print(f"❌ Composition Test Failed: {e}")
        return False

    return True

if __name__ == "__main__":
    if test_api():
        print("\n✨ Phase 3 is FULLY INTEGRATED and OPERATIONAL.")
    else:
        sys.exit(1)
