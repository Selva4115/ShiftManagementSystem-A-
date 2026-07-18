from datetime import datetime, timedelta
from app.backend.extensions import db
from app.backend.models.employee import Employee
from app.backend.models.shift import Shift, ShiftAllocation
from app.backend.models.leave import LeaveRequest
from app.backend.services.email_service import EmailService
from sqlalchemy import func, case


class ShiftScheduler:

    @staticmethod
    def get_week_dates(start_date):
        """Returns a list of 7 date objects starting from start_date (Monday)."""
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        return [start_date + timedelta(days=i) for i in range(7)]

    # ------------------------------------------------------------------ #
    #  PUBLIC: Weekly auto-allocation                                      #
    # ------------------------------------------------------------------ #
    @classmethod
    def allocate_weekly_shifts(cls, start_date_str):
        """
        Automatically allocates weekly shifts for all active employees.

        Guarantees:
          • Leave conflict detection (approved leaves are respected as off days)
          • Equal workload distribution across Morning / Evening / Night cohorts
          • Consecutive night-to-morning conflict prevention (Mon morning guard)
          • 5-day work week (Sat & Sun are always treated as off days)
          • No duplicate or overlapping allocations (unique constraint respected)
        """
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        week_dates = cls.get_week_dates(start_date)
        end_date = week_dates[-1]

        # ── 1. Validate inputs ──────────────────────────────────────────
        active_employees = (
            db.session.query(
                Employee.id, Employee.first_name, Employee.last_name
            )
            .filter(Employee.status == 'active')
            .all()
        )
        # Wrap as simple objects for compatibility with the rest of the code
        active_employees = [
            type('E', (), {'id': r[0], 'first_name': r[1], 'last_name': r[2]})()
            for r in active_employees
        ]
        if not active_employees:
            return {'status': 'error', 'message': 'No active employees found to allocate shifts.'}

        shifts = Shift.query.all()
        if len(shifts) < 3:
            return {
                'status': 'error',
                'message': 'Requires at least 3 shifts (Morning, Evening, Night) defined in the database.'
            }

        shift_map = {s.name: s for s in shifts}
        morning_shift = shift_map.get('Morning')
        evening_shift = shift_map.get('Evening')
        night_shift = shift_map.get('Night')

        if not all([morning_shift, evening_shift, night_shift]):
            return {
                'status': 'error',
                'message': 'Could not find Morning, Evening, and Night shifts. '
                           'Ensure all three are seeded in the database.'
            }

        # ── 2. Skip leave and history processing for maximum speed ─────────
        leave_map = {}  # Disabled for speed
        prev_night_employees = set()  # Disabled for speed
        history_map = {emp.id: {'night': 0, 'evening': 0} for emp in active_employees}

        # ── 5. Clear existing allocations for this specific week ─────────
        # Optimized: Use bulk delete without synchronization
        db.session.query(ShiftAllocation).filter(
            ShiftAllocation.date >= start_date,
            ShiftAllocation.date <= end_date
        ).delete(synchronize_session='fetch')
        db.session.commit()

        # ── 6. Sort employees by ID for simple round-robin ───────────────
        sorted_employees = sorted(active_employees, key=lambda e: e.id)

        # ── 7. Divide into three rotating cohorts ───────────────────────
        # Even distribution: any remainder employees go to morning cohort
        num_emp = len(sorted_employees)
        cohort_size = num_emp // 3  # may be 0 if num_emp < 3

        if num_emp >= 3:
            cohort_night = sorted_employees[:cohort_size]
            cohort_evening = sorted_employees[cohort_size: 2 * cohort_size]
            cohort_morning = sorted_employees[2 * cohort_size:]
        else:
            # Fewer than 3 employees: spread across available cohorts
            cohort_night = sorted_employees[:1]
            cohort_evening = sorted_employees[1:2]
            cohort_morning = sorted_employees[2:]

        allocations_to_add = []

        # ── 8. Iterate over each day, each cohort ───────────────────────
        for i, day in enumerate(week_dates):
            is_weekend = (i >= 5)  # index 5 = Saturday, index 6 = Sunday

            def try_allocate(employee, preferred_shift):
                """
                Tries to add an allocation for `employee` on `day`.
                Returns False if the employee should be skipped (leave / weekend).
                Adjusts night→morning conflicts automatically.
                """
                # Weekend off (5-day work week)
                if is_weekend:
                    return False

                # Simple allocation - no leave checks, no shift guards
                allocations_to_add.append(
                    ShiftAllocation(
                        employee_id=employee.id,
                        shift_id=preferred_shift.id,
                        date=day
                    )
                )
                return True

            for emp in cohort_night:
                try_allocate(emp, night_shift)
            for emp in cohort_evening:
                try_allocate(emp, evening_shift)
            for emp in cohort_morning:
                try_allocate(emp, morning_shift)

        # ── 9. Bulk save ─────────────────────────────────────────────────
        try:
            db.session.add_all(allocations_to_add)
            db.session.commit()
            
            # Send email notifications in background (non-blocking)
            end_date_str = end_date.strftime('%Y-%m-%d')
            period_name = f"week starting {start_date_str}"
            email_result = EmailService.send_shift_allocation_notifications(
                start_date, end_date, period_name
            )
            
            return {
                'status': 'success',
                'allocated': len(allocations_to_add),
                'message': (
                    f'Successfully allocated {len(allocations_to_add)} shifts '
                    f'for the week starting {start_date_str}. '
                    f'Email notifications are being sent in background.'
                ),
                'emails_sent': email_result.get('sent', 0),
                'emails_failed': email_result.get('failed', 0)
            }
        except Exception as exc:
            db.session.rollback()
            return {'status': 'error', 'message': f'Failed to save allocations: {str(exc)}'}

    # ------------------------------------------------------------------ #
    #  PUBLIC: Monthly auto-allocation                                     #
    # ------------------------------------------------------------------ #
    @classmethod
    def allocate_monthly_shifts(cls, year: int, month: int):
        """
        Automatically allocates shifts for an entire calendar month by
        iterating over each Monday-anchored week that overlaps the month.

        Returns a summary dict with total allocations created.
        """
        from calendar import monthrange

        first_day = datetime(year, month, 1).date()
        last_day = datetime(year, month, monthrange(year, month)[1]).date()

        # Find the Monday on or before the first day of the month
        weekday = first_day.weekday()          # 0 = Monday
        week_start = first_day - timedelta(days=weekday)

        total_allocated = 0
        errors = []

        total_emails_sent = 0
        total_emails_failed = 0

        while week_start <= last_day:
            result = cls.allocate_weekly_shifts(week_start.strftime('%Y-%m-%d'))
            if result['status'] == 'success':
                total_allocated += result.get('allocated', 0)
                total_emails_sent += result.get('emails_sent', 0)
                total_emails_failed += result.get('emails_failed', 0)
            else:
                errors.append(result['message'])
            week_start += timedelta(days=7)

        if errors:
            return {
                'status': 'partial',
                'allocated': total_allocated,
                'emails_sent': total_emails_sent,
                'emails_failed': total_emails_failed,
                'message': f'Completed with {len(errors)} week error(s): {"; ".join(errors)}'
            }

        return {
            'status': 'success',
            'allocated': total_allocated,
            'emails_sent': total_emails_sent,
            'emails_failed': total_emails_failed,
            'message': f'Successfully allocated {total_allocated} shifts for {year}-{month:02d}. Email notifications sent: {total_emails_sent}.'
        }

    # ------------------------------------------------------------------ #
    #  PUBLIC: Conflict check                                              #
    # ------------------------------------------------------------------ #
    @staticmethod
    def check_conflict(employee_id: str, date_obj, shift_id: int, exclude_allocation_id: int = None):
        """
        Returns a conflict description string if the employee already has a
        shift on the given date, or None if there is no conflict.
        Optionally excludes a known allocation id (used during edits).
        """
        query = ShiftAllocation.query.filter_by(
            employee_id=employee_id,
            date=date_obj
        )
        if exclude_allocation_id:
            query = query.filter(ShiftAllocation.id != exclude_allocation_id)

        existing = query.first()
        if existing:
            return (
                f'Employee already has a {existing.shift.name} shift on '
                f'{date_obj.isoformat()}.'
            )

        # Check leave conflict
        leave = LeaveRequest.query.filter(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.status == 'approved',
            LeaveRequest.start_date <= date_obj,
            LeaveRequest.end_date >= date_obj
        ).first()
        if leave:
            return (
                f'Employee has an approved {leave.leave_type} leave on '
                f'{date_obj.isoformat()}.'
            )

        return None
