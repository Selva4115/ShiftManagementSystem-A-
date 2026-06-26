@echo off
title Reset Admin Credentials
echo =============================================
echo   ShiftFlow - Reset Admin Login Credentials
echo =============================================
echo.
echo Running credential reset...
echo.
venv\Scripts\python.exe reset_admin.py
echo.
pause
