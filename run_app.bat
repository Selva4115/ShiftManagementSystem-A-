@echo off
title ShiftFlow Orchestrator
echo ====================================================================
echo                 ShiftFlow: Enterprise HRMS Startup
echo ====================================================================
echo.

echo [0/4] Releasing port locks (cleaning zombie processes)...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM node.exe 2>nul
timeout /t 1 /nobreak > nul
echo.

echo [1/4] Bootstrapping Flask API Backend Server (Port 5000)...
start "Flask Backend Engine" cmd /k "venv\Scripts\activate && python -m app.backend.app"

echo [2/4] Bootstrapping Vite React Client Server (Port 3000)...
start "Vite React Client" cmd /k "cd app\frontend && npm run dev"

echo [3/4] Launching ShiftFlow Share Console...
start "ShiftFlow Share Console" share.bat

echo [4/4] Opening Web Browser to Client Shell...
timeout /t 4 /nobreak > nul
start http://localhost:3000
