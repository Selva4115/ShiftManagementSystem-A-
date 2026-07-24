from flask import Flask, jsonify
from app.backend.config import Config
from app.backend.extensions import db, jwt, cors
from app.backend.routes import register_blueprints
from app.backend.middleware import handle_api_error
import os
from datetime import timedelta

def create_database_if_not_exists(app):
    if app.config.get('TESTING'):
        return
    db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    if 'mysql' not in db_uri:
        return
    import pymysql
    user = os.environ.get('DB_USER', 'root')
    password = os.environ.get('DB_PASSWORD', '')
    host = os.environ.get('DB_HOST', 'localhost')
    port = int(os.environ.get('DB_PORT', 3306))
    db_name = os.environ.get('DB_NAME', 'shift_db')
    try:
        conn = pymysql.connect(host=host, user=user, password=password, port=port)
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        app.logger.error(f"Database auto-creation warning: {str(e)}")

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    create_database_if_not_exists(app)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    
    # Configure CORS to allow access from Vite frontend
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints (routes)
    register_blueprints(app)
    @app.route("/")
    def home():
      return {
        "status": "success",
        "message": "Shift Management System API is Running!"
    }
    # Register global error handler
    app.register_error_handler(Exception, handle_api_error)

    # Bootstrapping logic inside application context
    with app.app_context():
        try:
            # Only create tables if they don't exist
            db.create_all()
        except Exception as e:
            app.logger.error(f"Database table creation check: {str(e)}")
            
        try:
            # Seed default records if database is empty and not in testing
            if not app.config.get('TESTING'):
                seed_database()
        except Exception as e:
            app.logger.error(f"Error during database seeding: {str(e)}")

    return app

def seed_database():
    """Seeds initial departments, roles, shifts, and the admin user if empty"""
    from app.backend.models.department import Department
    from app.backend.models.role import Role
    from app.backend.models.shift import Shift
    from app.backend.models.user import User
    from app.backend.models.employee import Employee
    from datetime import time, date

    # 1. Seed Departments
    if not Department.query.first():
        depts = [
            Department(name="Engineering", description="Software dev & infrastructure"),
            Department(name="Human Resources", description="Staffing & benefits"),
            Department(name="Support", description="Client support & operations")
        ]
        db.session.add_all(depts)
        db.session.flush()

    # 2. Seed Job Roles
    if not Role.query.first():
        roles = [
            Role(name="Senior Engineer", description="Technical lead"),
            Role(name="HR Manager", description="HR management operations"),
            Role(name="Support Analyst", description="Support engineer")
        ]
        db.session.add_all(roles)
        db.session.flush()

    # 3. Seed Shifts
    if not Shift.query.first():
        shifts = [
            Shift(name="Morning", start_time=time(6, 0), end_time=time(14, 0), color_code="#F59E0B"),
            Shift(name="Evening", start_time=time(14, 0), end_time=time(22, 0), color_code="#3B82F6"),
            Shift(name="Night", start_time=time(22, 0), end_time=time(6, 0), color_code="#10B981")
        ]
        db.session.add_all(shifts)
        db.session.flush()

    # 4. Seed Admin User & Profile (Check specifically by email)
    admin_user = User.query.filter_by(email="admin@shiftmanagement.com").first()
    if not admin_user:
        admin = User(email="admin@shiftmanagement.com", role="admin")
        admin.set_password("AdminPassword123")
        db.session.add(admin)
        db.session.flush()
    else:
        # Always ensure admin password is correct
        admin_user.set_password("AdminPassword123")
        db.session.flush()
        admin = admin_user

        # Create Profile
        first_dept = Department.query.first()
        first_role = Role.query.first()
        
        # Check if the employee ID also is not already used
        admin_profile = Employee.query.filter_by(id="EMP-2026-0001").first()
        if not admin_profile:
            admin_profile = Employee(
                id="EMP-2026-0001",
                user_id=admin.id,
                first_name="System",
                last_name="Administrator",
                phone="+15550199",
                department_id=first_dept.id if first_dept else None,
                role_id=first_role.id if first_role else None,
                hire_date=date(2026, 1, 1),
                status="active"
            )
            db.session.add(admin_profile)

    # Seed Manager User & Profile
    manager_user = User.query.filter_by(email="manager@shiftmanagement.com").first()
    if not manager_user:
        manager = User(email="manager@shiftmanagement.com", role="manager")
        manager.set_password("ManagerPassword123")
        db.session.add(manager)
        db.session.flush()
    else:
        manager_user.set_password("ManagerPassword123")
        db.session.flush()
        manager = manager_user

    # Ensure Manager profile exists
    depts = Department.query.all()
    roles = Role.query.all()
    dept_id = depts[1].id if len(depts) > 1 else (depts[0].id if depts else None)
    role_id = roles[1].id if len(roles) > 1 else (roles[0].id if roles else None)

    manager_profile = Employee.query.filter_by(id="EMP-2026-9999").first()
    if not manager_profile:
        manager_profile = Employee(
            id="EMP-2026-9999",
            user_id=manager.id,
            first_name="Shift",
            last_name="Manager",
            phone="+15550999",
            department_id=dept_id,
            role_id=role_id,
            hire_date=date(2026, 1, 1),
            status="active"
        )
        db.session.add(manager_profile)

    # Seed Default Employee User & Profile
    employee_user = User.query.filter_by(email="employee@shiftmanagement.com").first()
    if not employee_user:
        employee = User(email="employee@shiftmanagement.com", role="employee")
        employee.set_password("EmployeePassword123")
        db.session.add(employee)
        db.session.flush()
    else:
        employee_user.set_password("EmployeePassword123")
        db.session.flush()
        employee = employee_user

    # Ensure Employee profile exists
    dept_id = depts[2].id if len(depts) > 2 else (depts[0].id if depts else None)
    role_id = roles[2].id if len(roles) > 2 else (roles[0].id if roles else None)

    employee_profile = Employee.query.filter_by(id="EMP-2026-8888").first()
    if not employee_profile:
        employee_profile = Employee(
            id="EMP-2026-8888",
            user_id=employee.id,
            first_name="John",
            last_name="Employee",
            phone="+15550888",
            department_id=dept_id,
            role_id=role_id,
            hire_date=date(2026, 1, 1),
            status="active"
        )
        db.session.add(employee_profile)

    # 5. Seed 55 Mock Employees for rich analytics & paging
    if Employee.query.count() < 10:
        first_names = ['Liam', 'Noah', 'Oliver', 'James', 'Elijah', 'William', 'Henry', 'Lucas', 'Benjamin', 'Theodore', 'Charlotte', 'Amelia', 'Olivia', 'Emma', 'Ava', 'Isabella', 'Sophia', 'Mia', 'Evelyn', 'Harper', 'Mason', 'Logan', 'Alexander', 'Ethan', 'Jacob', 'Michael', 'Daniel', 'Jackson', 'Sebastian', 'Aiden', 'Matthew', 'Samuel', 'David', 'Joseph', 'Carter', 'Owen', 'Wyatt', 'John', 'Jack', 'Luke', 'Ezra', 'Levi', 'Isaac', 'Gabriel', 'Julian', 'Grayson', 'Anthony', 'Christopher', 'Joshua']
        last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz']
        depts = Department.query.all()
        roles = Role.query.all()
        
        if depts and roles:
            for i in range(2, 57): # EMP-2026-0002 to EMP-2026-0056
                email = f"emp{i}@shiftmanagement.com"
                if not User.query.filter_by(email=email).first():
                    user = User(email=email, role="employee")
                    user.set_password("EmployeePassword123")
                    db.session.add(user)
                    db.session.flush()
                    
                    dept = depts[i % len(depts)]
                    role = roles[i % len(roles)]
                    
                    emp_profile = Employee(
                        id=f"EMP-2026-{i:04d}",
                        user_id=user.id,
                        first_name=first_names[i % len(first_names)],
                        last_name=last_names[i % len(last_names)],
                        phone=f"+155502{i:02d}",
                        department_id=dept.id,
                        role_id=role.id,
                        hire_date=date(2026, 1, 1),
                        status="active" if i % 10 != 0 else "inactive"
                    )
                    db.session.add(emp_profile)
            db.session.commit()
            
            # Automatically allocate shifts for the current week starting Monday
            try:
                today = date.today()
                day_of_week = today.weekday()
                monday = today - timedelta(days=day_of_week)
                monday_str = monday.strftime('%Y-%m-%d')
                
                from app.backend.services.shift_scheduler import ShiftScheduler
                ShiftScheduler.allocate_weekly_shifts(monday_str)
            except Exception as sched_err:
                print("Warning: Could not automatically generate default week roster:", str(sched_err))

    db.session.commit()

# Expose app instance for runner script (e.g. flask run)
app = create_app()

if __name__ == '__main__':
    # Run the application
    app.run(host='0.0.0.0', port=5000, debug=True)
