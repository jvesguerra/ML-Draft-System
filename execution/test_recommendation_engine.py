import subprocess
import os
import sys

def run_node_test():
    print("🚀 Starting Phase 2: Recommendation Engine Smoke Test...")
    
    # Path to our Node.js test file
    test_file = os.path.join(os.getcwd(), 'backend', 'engine', '__tests__', 'engine.test.js')
    
    try:
        # Explicitly set encoding to utf-8 to handle emojis in stdout on Windows
        result = subprocess.run(
            ['node', test_file], 
            capture_output=True, 
            text=True, 
            encoding='utf-8', 
            check=False
        )
        
        output = result.stdout
        print("\n--- Node.js Engine Output ---")
        print(output)
        
        # Checking for "Passed:" case-insensitively instead of exact emoji string
        # to avoid Windows terminal encoding mishaps.
        if "Passed:" in output and "Failed:" not in output:
            print("✨ STATUS: Recommendation Engine logic is VALID.")
            return True
        else:
            print("⚠️ STATUS: Logic issues detected in the engine.")
            if result.stderr:
                print(f"Stderr: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ TEST ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    success = run_node_test()
    if not success:
        sys.exit(1)
