"""
run_app.py - Start ShiftFlow (same as run_app.bat)
Usage: python run_app.py
"""
import subprocess
import time
import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

print("====================================================================")
print("                ShiftFlow: Enterprise HRMS Startup")
print("====================================================================")
print()

# 1. Start Flask backend
print("[1/3] Bootstrapping Flask API Backend Server...")
subprocess.Popen(
    r'venv\Scripts\activate && python -m app.backend.app > backend.log 2>&1',
    shell=True,
    cwd=BASE_DIR
)

# 2. Start Vite frontend
print("[2/3] Bootstrapping Vite React Client Server...")
subprocess.Popen(
    r'cd app\frontend && npm run dev > ..\..\frontend.log 2>&1',
    shell=True,
    cwd=BASE_DIR
)

# 3. Wait then run share.py (same as bat)
print("[3/3] Scanning Local Network and Starting Public Sharing...")
print("(Please wait, checking port status and loading console...)")
print()
time.sleep(4)

share_script = os.path.join(BASE_DIR, 'share.py')
subprocess.run(
    [sys.executable, share_script],
    cwd=BASE_DIR
)
