import pymysql, sys

try:
    conn = pymysql.connect(
        host='localhost',
        user='root',
        password='Selva@4115',
        port=3306,
        connect_timeout=5
    )
    cur = conn.cursor()
    cur.execute('SHOW DATABASES')
    dbs = cur.fetchall()
    sys.stdout.write('Databases: ' + str([d[0] for d in dbs]) + '\n')
    sys.stdout.flush()

    # Check if shift_db exists
    db_names = [d[0] for d in dbs]
    if 'shift_db' in db_names:
        conn.select_db('shift_db')
        cur.execute('SELECT email, role FROM users LIMIT 5')
        rows = cur.fetchall()
        sys.stdout.write('Users in shift_db: ' + str(len(rows)) + '\n')
        for r in rows:
            sys.stdout.write('  ' + r[0] + ' | ' + r[1] + '\n')
    else:
        sys.stdout.write('shift_db does NOT exist yet!\n')
    sys.stdout.flush()
    conn.close()
except Exception as e:
    sys.stdout.write('DB ERROR: ' + str(e) + '\n')
    sys.stdout.flush()
