import pytest
from app.backend.models.employee import Employee
from app.backend.models.user import User

def test_employee_id_generation_overflow(client, init_database, app):
    """Test employee ID generation handles transition past 9999 without conflicts"""
    with app.app_context():
        # Clean up any existing EMP-2026-9999 or EMP-2026-10000
        existing = Employee.query.filter(Employee.id.in_(["EMP-2026-9999", "EMP-2026-10000", "EMP-2026-10001"])).all()
        for e in existing:
            init_database.session.delete(e)
        init_database.session.commit()

        # 1. Create employee with ID EMP-2026-9999
        user1 = User(email="temp_9999@test.com", role="employee")
        user1.set_password("TempPassword123")
        init_database.session.add(user1)
        init_database.session.flush()
        
        emp_9999 = Employee(
            id="EMP-2026-9999",
            user_id=user1.id,
            first_name="Temp",
            last_name="Manager",
            status="active"
        )
        init_database.session.add(emp_9999)
        init_database.session.commit()

        # 2. Generate new ID. It should be EMP-2026-10000
        id1 = Employee.generate_id()
        assert id1 == "EMP-2026-10000"

        # 3. Insert employee with ID EMP-2026-10000
        user2 = User(email="emp_10000@test.com", role="employee")
        user2.set_password("TempPassword123")
        init_database.session.add(user2)
        init_database.session.flush()
        
        emp_10000 = Employee(
            id=id1,
            user_id=user2.id,
            first_name="Nancy",
            last_name="Wheeler",
            status="active"
        )
        init_database.session.add(emp_10000)
        init_database.session.commit()

        # 4. Generate next ID. It should be EMP-2026-10001, not EMP-2026-10000 again
        id2 = Employee.generate_id()
        assert id2 == "EMP-2026-10001"
