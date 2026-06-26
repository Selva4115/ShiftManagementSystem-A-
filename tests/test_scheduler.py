import pytest
from datetime import date, timedelta
from app.backend.models.employee import Employee
from app.backend.models.user import User
from app.backend.models.leave import LeaveRequest
from app.backend.models.shift import ShiftAllocation
from app.backend.services.shift_scheduler import ShiftScheduler

def test_automatic_shift_allocation(app, init_database):
    """Tests the automatic weekly shift allocation algorithm with active employees"""
    with app.app_context():
        # 1. Create a mock employee
        user = User(email="emp1@test.com", role="employee")
        user.set_password("EmpPassword123")
        init_database.session.add(user)
        init_database.session.flush()

        emp = Employee(
            id="EMP-2026-9999",
            user_id=user.id,
            first_name="Jane",
            last_name="Doe",
            phone="+15550299",
            department_id=1,
            role_id=1,
            hire_date=date(2026, 1, 1),
            status="active"
        )
        init_database.session.add(emp)
        init_database.session.commit()

        # 2. Trigger auto allocator for a Monday
        result = ShiftScheduler.allocate_weekly_shifts("2026-06-22")
        assert result['status'] == 'success'

        # 3. Verify allocations (should have 5 working days scheduled, no weekend allocations)
        allocs = ShiftAllocation.query.filter_by(employee_id=emp.id).all()
        assert len(allocs) == 5
        
        # Verify weekend exclusion
        allocated_dates = {a.date for a in allocs}
        assert date(2026, 6, 27) not in allocated_dates # Saturday
        assert date(2026, 6, 28) not in allocated_dates # Sunday


def test_shift_allocation_leave_conflict(app, init_database):
    """Tests that employees on approved leave are not allocated shifts for those days"""
    with app.app_context():
        # 1. Create employee
        user = User(email="emp2@test.com", role="employee")
        user.set_password("EmpPassword123")
        init_database.session.add(user)
        init_database.session.flush()

        emp = Employee(
            id="EMP-2026-8888",
            user_id=user.id,
            first_name="John",
            last_name="Smith",
            hire_date=date(2026, 1, 1),
            status="active"
        )
        init_database.session.add(emp)
        init_database.session.commit()

        # 2. Create approved leave request for Wednesday (2026-06-24)
        leave = LeaveRequest(
            employee_id=emp.id,
            leave_type="sick",
            start_date=date(2026, 6, 24),
            end_date=date(2026, 6, 24),
            reason="Medical test",
            status="approved"
        )
        init_database.session.add(leave)
        init_database.session.commit()

        # 3. Trigger auto allocator
        ShiftScheduler.allocate_weekly_shifts("2026-06-22")

        # 4. Verify Wednesday is excluded from allocation
        wed_alloc = ShiftAllocation.query.filter_by(employee_id=emp.id, date=date(2026, 6, 24)).first()
        assert wed_alloc is None
