import pytest
import os
from app.backend.app import create_app
from app.backend.extensions import db
from app.backend.models.user import User
from app.backend.models.department import Department
from app.backend.models.role import Role
from app.backend.models.shift import Shift
from app.backend.models.employee import Employee
from datetime import time

# File-based temporary SQLite database for testing isolation
TEST_DB_PATH = 'test_temp.db'

class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{TEST_DB_PATH}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test-secret-key-long-enough-for-security-32-chars'
    JWT_SECRET_KEY = 'test-jwt-secret-key-long-enough-for-security-32-chars'

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    app = create_app(TestConfig)
    return app

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def init_database(app):
    """Seed necessary test database records"""
    with app.app_context():
        # Setup tables
        db.create_all()
        
        # Add basic dependencies
        dept = Department(name="QA", description="Quality Assurance")
        role = Role(name="Tester", description="Tests components")
        db.session.add_all([dept, role])
        
        # Add standard shifts
        morning = Shift(name="Morning", start_time=time(6, 0), end_time=time(14, 0), color_code="#F59E0B")
        evening = Shift(name="Evening", start_time=time(14, 0), end_time=time(22, 0), color_code="#3B82F6")
        night = Shift(name="Night", start_time=time(22, 0), end_time=time(6, 0), color_code="#10B981")
        db.session.add_all([morning, evening, night])
        
        # Seed test admin user & matching employee profile
        admin = User(email="admin@test.com", role="admin")
        admin.set_password("AdminPass123")
        db.session.add(admin)
        db.session.flush()

        admin_profile = Employee(
            id="EMP-2026-0001",
            user_id=admin.id,
            first_name="Test",
            last_name="Admin",
            department_id=dept.id,
            role_id=role.id,
            status="active"
        )
        db.session.add(admin_profile)
        
        db.session.commit()
        yield db
        
        # Clean up database
        db.session.remove()
        db.drop_all()

    # Remove temporary database file after tests complete
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except PermissionError:
            pass
