"""
run_app.py - Start ShiftFlow in a single console window (Silent Mode)
Usage: python run_app.py
"""
import subprocess
import time
import sys
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.system('') # Initialize ANSI escape codes in Windows Command Prompt

COLOR_GREEN  = "\033[92m"
COLOR_BLUE   = "\033[94m"
COLOR_CYAN   = "\033[96m"
COLOR_RED    = "\033[91m"
COLOR_RESET  = "\033[0m"
COLOR_BOLD   = "\033[1m"

def kill_process_by_port(port):
    try:
        # Find PID of process listening on port
        out = subprocess.check_output(f'netstat -ano | findstr LISTENING | findstr :{port}', shell=True, text=True)
        pids = set()
        for line in out.strip().split('\n'):
            parts = line.split()
            if len(parts) >= 5:
                pids.add(parts[-1])
        for pid in pids:
            if pid != '0':
                subprocess.run(f'taskkill /F /PID {pid} 2>nul', shell=True)
    except Exception:
        pass

def restore_api_client():
    client_path = os.path.join(BASE_DIR, "app", "frontend", "src", "api", "client.js")
    backup_path = os.path.join(BASE_DIR, ".api_client_backup")
    try:
        if os.path.exists(backup_path):
            with open(backup_path, "r") as f:
                content = f.read()
            with open(client_path, "w") as f:
                f.write(content)
            os.remove(backup_path)
            print("API client restored to original relative proxy.")
        else:
            with open(client_path, "r") as f:
                content = f.read()
            import re
            patched = re.sub(r"baseURL:\s*['\"].*?['\"]", "baseURL: ''", content)
            with open(client_path, "w") as f:
                f.write(patched)
            print("Forced API client to relative proxy.")
    except Exception as e:
        print(f"Could not restore API client: {e}")

print("====================================================================")
print("                ShiftFlow: Enterprise HRMS Startup")
print("====================================================================")
print()

# 0. Kill existing python/node processes by targeting ports 5000 and 3000
print("[0/4] Releasing port locks (cleaning port 5000 & 3000)...")
kill_process_by_port(5000)
kill_process_by_port(3000)
time.sleep(1)

# Open log files in write mode
backend_log = open(os.path.join(BASE_DIR, 'backend.log'), 'w', encoding='utf-8')
frontend_log = open(os.path.join(BASE_DIR, 'frontend.log'), 'w', encoding='utf-8')
share_log = open(os.path.join(BASE_DIR, 'share.log'), 'w', encoding='utf-8')

# 1. Start Flask backend
print("[1/4] Bootstrapping Flask API Backend Server (Port 5000) (Logs -> backend.log)...")
backend_proc = subprocess.Popen(
    r'venv\Scripts\activate && python -m app.backend.app',
    shell=True,
    cwd=BASE_DIR,
    stdout=backend_log,
    stderr=backend_log
)

# 2. Start Vite frontend
print("[2/4] Bootstrapping Vite React Client Server (Port 3000) (Logs -> frontend.log)...")
frontend_proc = subprocess.Popen(
    r'npm run dev',
    shell=True,
    cwd=os.path.join(BASE_DIR, 'app', 'frontend'),
    stdout=frontend_log,
    stderr=frontend_log
)

# 3. Start share console
print("[3/4] Launching ShiftFlow Share Console (Logs -> share.log)...")
share_proc = subprocess.Popen(
    [sys.executable, os.path.join(BASE_DIR, 'share.py')],
    cwd=BASE_DIR,
    stdout=share_log,
    stderr=share_log
)

# 4. Open browser
print("[4/4] Opening Web Browser...")
time.sleep(4)
import webbrowser
webbrowser.open("http://localhost:3000")

print(f"\n{COLOR_GREEN}{COLOR_BOLD}* SHIFTFLOW IS ONLINE *{COLOR_RESET}")
print(f"Local App Link: {COLOR_CYAN}{COLOR_BOLD}http://localhost:3000{COLOR_RESET}")
print(f"Press {COLOR_BOLD}Ctrl+C{COLOR_RESET} in this terminal to gracefully terminate all services.\n")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\nShutting down ShiftFlow services...")
finally:
    # Graceful shutdown of subprocesses
    try:
        backend_proc.terminate()
    except Exception:
        pass
    try:
        frontend_proc.terminate()
    except Exception:
        pass
    try:
        share_proc.terminate()
    except Exception:
        pass
    
    # Sweep lock releases
    kill_process_by_port(5000)
    kill_process_by_port(3000)
    
    # Restore frontend client setting
    restore_api_client()
    
    # Close log files
    try:
        backend_log.close()
    except Exception:
        pass
    try:
        frontend_log.close()
    except Exception:
        pass
    try:
        share_log.close()
    except Exception:
        pass
        
    print("\nAll services stopped. Goodbye!")

