"""
Reset / create the admin user in shift_db.
Run: venv\Scripts\python.exe reset_admin.py
"""
import socket, sys

# --- Quick port check before attempting DB connection ---
def port_open(host, port, timeout=2):
    try:
        s = socket.create_connection((host, port), timeout=timeout)
        s.close()
        return True
    except Exception:
        return False

HOST = 'localhost'
PORT = 3306
DB_USER = 'root'
DB_PASS = 'Selva@4115'
DB_NAME = 'shift_db'

ADMIN_EMAIL    = 'admin@shift.com'
ADMIN_PASSWORD = 'Admin@123'

print("Checking MySQL connection on port 3306...")
if not port_open(HOST, PORT):
    print("ERROR: Cannot reach MySQL on localhost:3306.")
    print("Make sure MySQL service is running.")
    sys.exit(1)

print("MySQL port is open. Connecting...")

try:
    import pymysql
except ImportError:
    print("ERROR: pymysql not installed. Run: venv\\Scripts\\pip install pymysql")
    sys.exit(1)

try:
    from werkzeug.security import generate_password_hash
except ImportError:
    print("ERROR: werkzeug not installed. Run: venv\\Scripts\\pip install werkzeug")
    sys.exit(1)

try:
    conn = pymysql.connect(
        host=HOST, user=DB_USER, password=DB_PASS,
        port=PORT, connect_timeout=3
    )
    cur = conn.cursor()

    # Ensure shift_db exists
    cur.execute("SHOW DATABASES LIKE 'shift_db'")
    if not cur.fetchone():
        print("shift_db not found. Creating it now...")
        cur.execute("CREATE DATABASE shift_db")

    conn.select_db(DB_NAME)

    # Check if users table exists
    cur.execute("SHOW TABLES LIKE 'users'")
    if not cur.fetchone():
        print("ERROR: 'users' table does not exist yet.")
        print("Please start the Flask app once first (run_app.bat) to create tables, then re-run this script.")
        conn.close()
        sys.exit(1)

    # Show current users
    cur.execute("SELECT id, email, role FROM users")
    users = cur.fetchall()
    print(f"\nExisting users ({len(users)} total):")
    for u in users[:8]:
        print(f"  id={u[0]}  email={u[1]}  role={u[2]}")

    # Generate hash for the new password
    new_hash = generate_password_hash(ADMIN_PASSWORD)

    # Update or insert admin
    cur.execute("SELECT id FROM users WHERE role='admin' LIMIT 1")
    admin = cur.fetchone()

    if admin:
        cur.execute(
            "UPDATE users SET email=%s, password_hash=%s WHERE id=%s",
            (ADMIN_EMAIL, new_hash, admin[0])
        )
        print(f"\n[OK] Updated existing admin (id={admin[0]})")
    else:
        cur.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, 'admin')",
            (ADMIN_EMAIL, new_hash, )
        )
        print("\n[OK] Created new admin user")

    conn.commit()
    print("\n==============================================")
    print("  Login credentials reset successfully!")
    print("  Email   : admin@shift.com")
    print("  Password: Admin@123")
    print("==============================================")
    conn.close()

except pymysql.err.OperationalError as e:
    print(f"\nDB Connection Error: {e}")
    print("Check your MySQL root password in .env (DB_PASSWORD=Selva@4115)")
    sys.exit(1)
except Exception as e:
    print(f"\nUnexpected error: {e}")
    sys.exit(1)
