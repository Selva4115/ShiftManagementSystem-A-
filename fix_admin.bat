@echo off
cd /d "c:\Users\ELCOT\Desktop\ShiftManagementSystem(A)"
set MYSQL="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
set HASH=scrypt:32768:8:1$asbGgMH4fnxttM8V$571a553f7e493930e8e6e67770c57a02481a6113ffc71ae53414863a47d4a89db6f04a54e60748cc2c030140c3712482a83398fde82ea0fe0ad54c89b8126a90

echo Removing duplicate admin (id=57)...
%MYSQL% -u root -pSelva@4115 shift_db -e "DELETE FROM users WHERE id=57;"

echo Updating admin (id=1) with new email and password...
%MYSQL% -u root -pSelva@4115 shift_db -e "UPDATE users SET email='admin@shift.com', password_hash='%HASH%' WHERE id=1;"

echo Verifying...
%MYSQL% -u root -pSelva@4115 shift_db -e "SELECT id, email, role FROM users WHERE role='admin';"

echo.
echo ============================================
echo  Login with:
echo  Email   : admin@shift.com
echo  Password: Admin@123
echo ============================================
pause
