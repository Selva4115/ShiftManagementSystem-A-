from datetime import datetime, timedelta
from app.backend.extensions import db
from app.backend.models.employee import Employee
from app.backend.models.shift import Shift, ShiftAllocation
from app.backend.models.leave import LeaveRequest
from sqlalchemy import func

class ShiftScheduler:
    
    @staticmethod
    def get_week_dates(start_date):
        """Returns a list of 7 date objects starting from start_date (Monday)"""
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        return [start_date + timedelta(days=i) for i in range(7)]

    @classmethod
    def allocate_weekly_shifts(cls, start_date_str):
        """
        Automatically allocates weekly shifts to all active employees.
        Ensures:
          1. Leave conflict detection
          2. Equal workload distribution
          3. Consecutive night-to-morning shift conflict prevention
          4. 5-day work week with 2 days off (typically Saturday & Sunday, or customized)
        """
        # Parse start date (expected to be a Monday)
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        week_dates = cls.get_week_dates(start_date)
        end_date = week_dates[-1]

        # Get active employees
        active_employees = Employee.query.filter_by(status='active').all()
        if not active_employees:
            return {'status': 'error', 'message': 'No active employees found to allocate shifts'}

        # Get standard shifts
        shifts = Shift.query.all()
        if len(shifts) < 3:
            return {'status': 'error', 'message': 'Requires at least 3 shifts (Morning, Evening, Night) defined in database'}
        
        # Map shift names to shift objects
        shift_map = {s.name: s for s in shifts}
        morning_shift = shift_map.get('Morning')
        evening_shift = shift_map.get('Evening')
        night_shift = shift_map.get('Night')

        # Get all approved leave requests for the week
        leaves = LeaveRequest.query.filter(
            LeaveRequest.status == 'approved',
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date
        ).all()

        # Build leave lookup map: {employee_id: [list of leave dates]}
        leave_map = {}
        for leave in leaves:
            if leave.employee_id not in leave_map:
                leave_map[leave.employee_id] = set()
            curr = max(leave.start_date, start_date)
            limit = min(leave.end_date, end_date)
            while curr <= limit:
                leave_map[leave.employee_id].add(curr)
                curr += timedelta(days=1)

        # Get previous week's Sunday shifts (to check for Night -> Morning conflicts on Monday)
        prev_sunday = start_date - timedelta(days=1)
        prev_sunday_allocations = ShiftAllocation.query.filter_by(date=prev_sunday).all()
        prev_night_employees = {a.employee_id for a in prev_sunday_allocations if a.shift.name == 'Night'}

        # Get historical shift allocation counts to balance workload
        # We query the total count of night and evening shifts for each employee to balance the load
        history = db.session.query(
            ShiftAllocation.employee_id,
            func.sum(db.case((Shift.name == 'Night', 1), else_=0)).label('night_count'),
            func.sum(db.case((Shift.name == 'Evening', 1), else_=0)).label('evening_count')
        ).join(Shift).group_by(ShiftAllocation.employee_id).all()

        history_map = {h.employee_id: {'night': h.night_count, 'evening': h.evening_count} for h in history}
        for emp in active_employees:
            if emp.id not in history_map:
                history_map[emp.id] = {'night': 0, 'evening': 0}

        # Clear any existing scheduled allocations for this week
        ShiftAllocation.query.filter(
            ShiftAllocation.date >= start_date,
            ShiftAllocation.date <= end_date
        ).delete()

        # Sort employees by historical night shift count (ascending), then evening shift count (ascending)
        # to ensure those who worked fewer night/evening shifts get them allocated first
        sorted_employees = sorted(active_employees, key=lambda e: (history_map[e.id]['night'], history_map[e.id]['evening']))

        # Determine allocation groupings
        # We divide the workforce into three rotating cohorts (Morning, Evening, Night) for this week
        num_emp = len(sorted_employees)
        cohort_size = num_emp // 3
        
        cohort_night = sorted_employees[:cohort_size] if cohort_size > 0 else []
        cohort_evening = sorted_employees[cohort_size:2*cohort_size] if cohort_size > 0 else []
        cohort_morning = sorted_employees[2*cohort_size:] if cohort_size > 0 else sorted_employees

        allocations_to_add = []

        # Iterate over all 7 days of the week
        for i, day in enumerate(week_dates):
            is_weekend = (i >= 5)  # Saturday & Sunday are indices 5 & 6

            # Function to allocate shift if no leave exists and no consecutive night/morning conflicts
            def try_allocate(employee, preferred_shift):
                # 1. Leave Check
                if employee.id in leave_map and day in leave_map[employee.id]:
                    return False # Employee is on leave

                # 2. Weekend Check (Give weekend off for a 5-day work week)
                if is_weekend:
                    return False

                # 3. Night -> Morning Consecutive Shift Check (Monday morning)
                if day == start_date and preferred_shift.name == 'Morning' and employee.id in prev_night_employees:
                    # Switch this employee to Evening shift to prevent conflict
                    preferred_shift = evening_shift

                # Create allocation
                alloc = ShiftAllocation(
                    employee_id=employee.id,
                    shift_id=preferred_shift.id,
                    date=day
                )
                allocations_to_add.append(alloc)
                return True

            # Allocate shifts based on cohort membership
            for emp in cohort_night:
                try_allocate(emp, night_shift)
            for emp in cohort_evening:
                try_allocate(emp, evening_shift)
            for emp in cohort_morning:
                try_allocate(emp, morning_shift)

        # Bulk save allocations
        try:
            db.session.add_all(allocations_to_add)
            db.session.commit()
            return {
                'status': 'success',
                'message': f'Successfully allocated {len(allocations_to_add)} shifts for the week starting {start_date_str}'
            }
        except Exception as e:
            db.session.rollback()
            return {'status': 'error', 'message': f'Failed to allocate shifts: {str(e)}'}
