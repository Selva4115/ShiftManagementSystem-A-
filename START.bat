@echo off
title ShiftFlow
color 0A
echo ====================================================
echo         ShiftFlow - Starting...
echo ====================================================
echo.

echo Cleaning up zombie python and node processes...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM node.exe 2>nul
timeout /t 1 /nobreak > nul
echo.

echo [1] Starting Flask Backend...
start "Backend" cmd /k "cd /d C:\Users\ELCOT\Desktop\ShiftManagementSystem(A) && venv\Scripts\activate && python -m app.backend.app"

echo [2] Starting Vite Frontend...
start "Frontend" cmd /k "cd /d C:\Users\ELCOT\Desktop\ShiftManagementSystem(A)\app\frontend && npm run dev"

echo [3] Waiting 10 seconds for servers to start...
timeout /t 10 /nobreak > nul

echo [4] Opening Browser...
start http://localhost:3000

echo.
echo ====================================================
echo  ShiftFlow is running at http://localhost:3000
echo  Login: admin@shiftmanagement.com
echo  Password: AdminPassword123
echo ====================================================
