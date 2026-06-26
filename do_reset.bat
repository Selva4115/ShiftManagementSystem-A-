@echo off
cd /d "c:\Users\ELCOT\Desktop\ShiftManagementSystem(A)"

echo Generating password hash...
venv\Scripts\python.exe gen_hash.py > hash_output.txt
type hash_output.txt

echo.
echo Now updating database...
venv\Scripts\python.exe reset_admin.py
echo.
echo Script complete.
