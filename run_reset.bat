@echo off
title ShiftFlow - Admin Reset
cd /d "c:\Users\ELCOT\Desktop\ShiftManagementSystem(A)"

set MYSQL="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
set HASH=scrypt:32768:8:1$asbGgMH4fnxttM8V$571a553f7e493930e8e6e67770c57a02481a6113ffc71ae53414863a47d4a89db6f04a54e60748cc2c030140c3712482a83398fde82ea0fe0ad54c89b8126a90

echo.
echo [1/3] Checking database exists...
%MYSQL% -u root -pSelva@4115 -e "CREATE DATABASE IF NOT EXISTS shift_db;"

echo [2/3] Resetting admin credentials...
%MYSQL% -u root -pSelva@4115 shift_db -e "UPDATE users SET email='admin@shift.com', password_hash='%HASH%' WHERE role='admin';"

echo [3/3] Verifying...
%MYSQL% -u root -pSelva@4115 shift_db -e "SELECT id, email, role FROM users WHERE role='admin';"

echo.
echo ============================================
echo  Done! Login with:
echo  Email   : admin@shift.com
echo  Password: Admin@123
echo ============================================
echo.
pause
