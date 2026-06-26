@echo off
title ShiftFlow Console
color 0B
echo ====================================================================
echo                 ShiftFlow: Enterprise HRMS Startup
echo ====================================================================
echo.

echo [1/3] Bootstrapping Flask API Backend Server...
start /B cmd /c "venv\Scripts\activate && python -m app.backend.app > backend.log 2>&1"

echo [2/3] Bootstrapping Vite React Client Server...
start /B cmd /c "cd app\frontend && npm run dev > ..\..\frontend.log 2>&1"

echo [3/3] Scanning Local Network and Starting Public Sharing...
echo (Please wait, checking port status and loading console...)
echo.

ping -n 4 127.0.0.1 > nul
venv\Scripts\python share.py
