import subprocess
import time
import sys
import os

def start_services():
    print("🌟 Initializing MLBB Draft Assistant Full-Stack...")
    
    # On Windows, we need shell=True to find node/npm in the PATH
    use_shell = os.name == 'nt'

    try:
        # 1. Start Backend in a background process
        print("🚀 Starting Backend API on port 3001...")
        backend_process = subprocess.Popen(
            ["node", "index.js"],
            cwd=os.path.join(os.getcwd(), "backend"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            shell=use_shell
        )
        
        # 2. Start Frontend in a background process
        print("🎨 Starting Frontend (Vite) on port 5173...")
        frontend_process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=os.path.join(os.getcwd(), "frontend"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            shell=use_shell
        )
        
        print("\n✅ System launched successfully!")
        print("🔗 API: http://localhost:3001")
        print("🔗 UI:  http://localhost:5173")
        print("\nNote: Processes are running in the background. Press Ctrl+C to terminate.")

        # Give them a moment to start so we can check for immediate crashes
        time.sleep(2)
        if backend_process.poll() is not None:
             print("❌ Backend failed to start. Check your node installation.")
        if frontend_process.poll() is not None:
             print("❌ Frontend failed to start. Check your npm installation.")

        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n🛑 Shutting down MLBB Draft System...")
        backend_process.terminate()
        frontend_process.terminate()
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error starting system: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_services()
