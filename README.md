# ShiftFlow: Automatic Weekly Shift Allocation & Attendance Management System

An enterprise-grade Human Resource Management System (HRMS) designed for automated weekly shift rotations, workload balancing, leaf conflicts checking, and attendance reconciliation. Built with a modular, domain-based structure combining React and Flask.

---

## 📂 Project Structure

```text
ShiftManagementSystem/
│
├── app/
│   ├── backend/
│   │   ├── app.py                  # Flask Entry Point & Seed Logic
│   │   ├── config.py               # Settings & Environment variables loader
│   │   ├── extensions.py           # DB, JWT, CORS loaders
│   │   ├── middleware.py           # RBAC decorators
│   │   ├── models/                 # Database schema models
│   │   ├── routes/                 # Blueprints & Controllers
│   │   └── services/               # Workload rotation & report compilers
│   │
│   └── frontend/
│       ├── src/
│       │   ├── App.jsx             # Core Client routes
│       │   ├── index.css           # Vanilla CSS Design System tokens
│       │   ├── api/                # Axios configuration
│       │   ├── components/         # Reusable structural widgets
│       │   └── pages/              # Routing modules
│       ├── package.json
│       └── vite.config.js
│
├── docs/
│   ├── database_design.md          # MySQL Schema and DDL script
│   ├── api_documentation.md        # API Route parameters
│   └── deployment_guide.md         # Production deployment steps
│
├── tests/
│   ├── conftest.py                 # PyTest mock environment configs
│   ├── test_auth.py                # Login tests
│   ├── test_scheduler.py           # Schedule balancing tests
│   └── test_attendance.py          # Clock actions tests
│
├── .env                            # App credentials
├── .gitignore                      # Git exclude filters
├── requirements.txt                # Python packages
└── README.md                       # Repository overview
```

---

## 🛠️ Technology Stack
- **Frontend**: React.js (v18), Vite, React Router DOM (v6), Axios, Lucide Icons, Recharts.
- **Backend**: Python Flask (v3), SQLAlchemy, Flask-JWT-Extended, CORS.
- **Database**: MySQL (v8.0) using PyMySQL driver.

---

## 🔑 Default Session Credentials for Testing
After launching the system for the first time, you can log in using the pre-seeded administrator credentials:
- **Email**: `admin@shift.com`
- **Password**: `Admin@123`

---

## 🚀 Installation & Setup Guides

### 1. Database Initialization
1. Ensure your local MySQL instance is running.
2. Edit the `.env` file at the project root directory and update your connection credentials:
   ```env
   DATABASE_URL=mysql+pymysql://<user>:<password>@localhost:3306/shift_db
   ```
   *(Note: The backend automatically compiles the tables, seed departments, shifts, and the admin user on the first start of the application).*

### 2. Backend Installation & Run
1. Create a Python Virtual Environment:
   ```bash
   python -m venv venv
   ```
2. Activate Virtual Environment:
   - **Windows**: `venv\Scripts\activate`
   - **macOS/Linux**: `source venv/bin/activate`
3. Install Python requirements:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the Flask App:
   ```bash
   python -m app.backend.app
   ```
   *(The server will boot on `http://localhost:5000`)*

> **Shortcut:** You can also start both backend and frontend together by running:
> ```bash
> python run_app.py
> ```
> or simply double-click `run_app.bat`

### 3. Frontend Installation & Run
1. Navigate to the frontend directory:
   ```bash
   cd app/frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Launch Vite Development Server:
   ```bash
   npm run dev
   ```
   *(Vite will boot on `http://localhost:3000` and proxy `/api` routes directly to Gunicorn/Flask on port 5000)*

### 4. Running unit tests
To run the automated tests using the in-memory SQLite setup:
1. Ensure you are at the project root and the virtual environment is active:
   ```bash
   pytest tests/
   ```
