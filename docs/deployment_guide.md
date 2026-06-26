# Production Deployment Guide

This document describes how to deploy the Shift & Attendance Management System to a production server environment, with a focus on Windows hosting (using IIS, Waitress, or Apache) and MySQL.

---

## 1. Prerequisites
Before deploying, make sure the server has:
- **Python 3.10+** installed.
- **Node.js 18+** installed.
- **MySQL Server 8.0+** running (locally or on a separate cloud database instance).

---

## 2. Database Provisioning
1. Open MySQL Workbench or your favorite CLI.
2. Execute the DDL schema script found in the [database_design.md](file:///c:/Users/ELCOT/Desktop/ShiftManagementSystem%28A%29/docs/database_design.md) file.
3. Configure database access rules (ensure the user credentials matches the ones inside the `.env` file).

---

## 3. Frontend Production Build
To package and optimize the React frontend for high-speed delivery:
1. Navigate to the frontend directory:
   ```bash
   cd app/frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Run the production build command:
   ```bash
   npm run build
   ```
This generates a static output folder under `app/frontend/dist/` containing `index.html` and assets.

---

## 4. Serving Frontend from Flask in Production
In production, to avoid running two web servers, Flask can be configured to serve the React static assets directly. The `app.py` has been designed such that we can easily enable this configuration:
```python
# In app/backend/app.py:
# Change static folder definition:
app = Flask(__name__, static_folder='../frontend/dist', static_url_path='/')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')
```
This serves the React single-page app dynamically, routing API requests to `/api` and any other routes to React Router!

---

## 5. Running the Backend Server (Windows WSGI)
Because Gunicorn does not support Windows natively, we use **Waitress** (a production-ready pure-Python WSGI server) to serve the backend.

1. Activate your virtual environment and install Waitress:
   ```bash
   pip install waitress
   ```
2. Launch Waitress, targeting the Flask app wrapper:
   ```bash
   waitress-serve --listen=0.0.0.0:5000 app.backend.app:app
   ```

---

## 6. Environment Security Checklist
- [ ] Set `FLASK_DEBUG=0` inside the `.env` file.
- [ ] Change the `SECRET_KEY` and `JWT_SECRET_KEY` variables to 32-character random hash strings.
- [ ] Update the `DATABASE_URL` with secure credentials.
- [ ] Configure firewall rules to only allow port `5000` (Waitress) or port `80/443` (if reverse-proxied using IIS).
