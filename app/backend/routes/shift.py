from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from app.backend.models.shift import Shift, ShiftAllocation
from app.backend.models.employee import Employee
from app.backend.extensions import db
from app.backend.middleware import role_required
from app.backend.services.shift_scheduler import ShiftScheduler
from app.backend.services.report_generator import ReportGenerator
from app.backend.services.email_service import EmailService
from datetime import datetime
import calendar
import os

shift_bp = Blueprint('shift', __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Shift Definitions
# ─────────────────────────────────────────────────────────────────────────────

@shift_bp.route('', methods=['GET'])
@jwt_required()
def list_shifts():
    """Returns all standard shift definitions."""
    shifts = Shift.query.all()
    return jsonify([s.to_dict() for s in shifts]), 200


# ─────────────────────────────────────────────────────────────────────────────
# Roster / Allocations – Read
# ─────────────────────────────────────────────────────────────────────────────

@shift_bp.route('/allocations', methods=['GET'])
@jwt_required()
def list_allocations():
    """
    Returns allocations optionally filtered by date range and/or employee.
    Query params: start_date, end_date, employee_id
    """
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    employee_id = request.args.get('employee_id')

    query = ShiftAllocation.query

    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            query = query.filter(ShiftAllocation.date >= start_date)
        except ValueError:
            return jsonify({'message': 'Invalid start_date. Expected YYYY-MM-DD.'}), 400

    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            query = query.filter(ShiftAllocation.date <= end_date)
        except ValueError:
            return jsonify({'message': 'Invalid end_date. Expected YYYY-MM-DD.'}), 400

    if employee_id:
        query = query.filter(ShiftAllocation.employee_id == employee_id)

    allocations = query.order_by(ShiftAllocation.date.asc()).all()
    return jsonify([a.to_dict() for a in allocations]), 200


# ─────────────────────────────────────────────────────────────────────────────
# Auto Allocation – Weekly
# ─────────────────────────────────────────────────────────────────────────────

@shift_bp.route('/allocations/auto', methods=['POST'])
@jwt_required()
@role_required(['admin', 'manager'])
def run_auto_allocation():
    """
    Triggers the weekly shift rotation algorithm.
    Body: { "start_date": "YYYY-MM-DD" }  (must be a Monday)
    """
    data = request.get_json() or {}
    start_date_str = data.get('start_date', '').strip()

    if not start_date_str:
        return jsonify({'message': 'start_date (YYYY-MM-DD) is required.'}), 400

    try:
        date_obj = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    if date_obj.weekday() != 0:
        return jsonify({
            'message': (
                'Automatic weekly allocation must start on a Monday. '
                f'{start_date_str} is a {date_obj.strftime("%A")}.'
            )
        }), 400

    print(f"Starting auto allocation for {start_date_str}")
    result = ShiftScheduler.allocate_weekly_shifts(start_date_str)
    print(f"Allocation result: {result}")

    if result['status'] == 'error':
        return jsonify({'message': result['message']}), 500

    return jsonify({
        'message': result['message'],
        'allocated': result.get('allocated', 0),
        'emails_sent': result.get('emails_sent', 0),
        'emails_failed': result.get('emails_failed', 0)
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# Auto Allocation – Monthly
# ─────────────────────────────────────────────────────────────────────────────

@shift_bp.route('/allocations/auto/monthly', methods=['POST'])
@jwt_required()
@role_required(['admin', 'manager'])
def run_auto_allocation_monthly():
    """
    Triggers the monthly shift rotation algorithm.
    Body: { "year": 2026, "month": 7 }
    """
    data = request.get_json() or {}
    year = data.get('year')
    month = data.get('month')

    if not year or not month:
        return jsonify({'message': 'year and month are required.'}), 400

    try:
        year = int(year)
        month = int(month)
        if not (1 <= month <= 12):
            raise ValueError('Month out of range')
    except (ValueError, TypeError):
        return jsonify({'message': 'year must be a valid integer and month must be 1–12.'}), 400

    result = ShiftScheduler.allocate_monthly_shifts(year, month)

    status_code = 200 if result['status'] in ('success', 'partial') else 500
    return jsonify({'message': result['message'], 'allocated': result.get('allocated', 0)}), status_code


# ─────────────────────────────────────────────────────────────────────────────
# Manual Allocation – Create / Update
# ─────────────────────────────────────────────────────────────────────────────

@shift_bp.route('/allocations/manual', methods=['POST'])
@jwt_required()
@role_required(['admin', 'manager'])
def create_manual_allocation():
    """
    Manually assigns (or removes) an employee's shift for a specific date.
    Body: { "employee_id": "...", "shift_id": <int|"none">, "date": "YYYY-MM-DD" }

    • Passing shift_id as null / "none" / "" removes the shift (sets Off Duty).
    • Conflict validation is applied; pass force=true to override leave conflicts.
    """
    data = request.get_json() or {}
    employee_id = data.get('employee_id', '').strip()
    shift_id_raw = data.get('shift_id')
    date_str = data.get('date', '').strip()
    force = bool(data.get('force', False))

    print(f"Manual allocation request: employee_id={employee_id}, shift_id={shift_id_raw}, date={date_str}, force={force}")

    # ── Validate required fields ──────────────────────────────────────
    if not employee_id or not date_str:
        return jsonify({'message': 'employee_id and date are required.'}), 400

    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    # ── Validate employee ─────────────────────────────────────────────
    employee = Employee.query.get(employee_id)
    if not employee:
        return jsonify({'message': f'Employee "{employee_id}" not found.'}), 404

    # ── Off Duty: remove any existing allocation ──────────────────────
    if shift_id_raw is None or str(shift_id_raw).lower() in ('', 'none', 'null'):
        allocation = ShiftAllocation.query.filter_by(
            employee_id=employee_id, date=date_obj
        ).first()
        if allocation:
            shift = Shift.query.get(allocation.shift_id)
            db.session.delete(allocation)
            try:
                db.session.commit()
                # Send email notification in background
                EmailService.send_manual_allocation_notification(employee, allocation, shift, 'removed')
                return jsonify({'message': 'Allocation removed. Employee is now Off Duty.'}), 200
            except Exception as exc:
                db.session.rollback()
                return jsonify({'message': 'Failed to remove allocation.', 'error': str(exc)}), 500
        return jsonify({'message': 'No allocation found; employee is already Off Duty.'}), 200

    # ── Parse and validate shift_id ───────────────────────────────────
    try:
        shift_id = int(shift_id_raw)
    except (ValueError, TypeError):
        return jsonify({'message': 'shift_id must be a valid integer.'}), 400

    shift = Shift.query.get(shift_id)
    if not shift:
        return jsonify({'message': f'Shift with id {shift_id} does not exist.'}), 404

    # ── Conflict check ────────────────────────────────────────────────
    existing = ShiftAllocation.query.filter_by(
        employee_id=employee_id, date=date_obj
    ).first()

    if not force:
        conflict_msg = ShiftScheduler.check_conflict(
            employee_id=employee_id,
            date_obj=date_obj,
            shift_id=shift_id,
            exclude_allocation_id=existing.id if existing else None
        )
        if conflict_msg:
            # Return 409 with conflict details so the UI can prompt the user
            return jsonify({
                'message': conflict_msg,
                'conflict': True
            }), 409

    # ── Save (upsert) ─────────────────────────────────────────────────
    if existing:
        existing.shift_id = shift_id
        target = existing
    else:
        target = ShiftAllocation(
            employee_id=employee_id,
            shift_id=shift_id,
            date=date_obj
        )
        db.session.add(target)

    try:
        db.session.commit()
        # Send email notification in background
        EmailService.send_manual_allocation_notification(employee, target, shift, 'assigned')
        return jsonify(target.to_dict()), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'message': 'Failed to save allocation.', 'error': str(exc)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Manual Allocation – Delete by ID
# ─────────────────────────────────────────────────────────────────────────────

@shift_bp.route('/allocations/<int:allocation_id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin', 'manager'])
def delete_allocation(allocation_id):
    """Deletes a specific shift allocation by its primary key."""
    allocation = ShiftAllocation.query.get(allocation_id)
    if not allocation:
        return jsonify({'message': 'Allocation not found.'}), 404

    db.session.delete(allocation)
    try:
        db.session.commit()
        return jsonify({'message': 'Allocation deleted successfully.'}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'message': 'Failed to delete allocation.', 'error': str(exc)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Conflict Validation (preview, no write)
# ─────────────────────────────────────────────────────────────────────────────

@shift_bp.route('/allocations/validate', methods=['POST'])
@jwt_required()
@role_required(['admin', 'manager'])
def validate_allocation():
    """
    Checks whether a proposed manual allocation has conflicts.
    Body: { "employee_id": "...", "shift_id": <int>, "date": "YYYY-MM-DD",
            "exclude_id": <int|null> }
    Returns: { "conflict": bool, "message": "..." }
    """
    data = request.get_json() or {}
    employee_id = data.get('employee_id', '').strip()
    shift_id_raw = data.get('shift_id')
    date_str = data.get('date', '').strip()
    exclude_id = data.get('exclude_id')

    if not employee_id or not date_str:
        return jsonify({'message': 'employee_id and date are required.'}), 400

    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    try:
        shift_id = int(shift_id_raw) if shift_id_raw is not None else None
    except (ValueError, TypeError):
        shift_id = None

    conflict_msg = ShiftScheduler.check_conflict(
        employee_id=employee_id,
        date_obj=date_obj,
        shift_id=shift_id,
        exclude_allocation_id=int(exclude_id) if exclude_id else None
    )

    if conflict_msg:
        return jsonify({'conflict': True, 'message': conflict_msg}), 200

    return jsonify({'conflict': False, 'message': 'No conflict detected.'}), 200


# ─────────────────────────────────────────────────────────────────────────────
# Bulk Delete – by date range
# ─────────────────────────────────────────────────────────────────────────────

@shift_bp.route('/allocations/range', methods=['DELETE'])
@jwt_required()
@role_required(['admin', 'manager'])
def delete_allocations_range():
    """
    Deletes ALL shift allocations within a date range.
    Query params: start_date, end_date  (YYYY-MM-DD)
    Both are required. To delete all time use 2000-01-01 to 2099-12-31.
    """
    start_date_str = request.args.get('start_date', '').strip()
    end_date_str   = request.args.get('end_date', '').strip()

    if not start_date_str or not end_date_str:
        return jsonify({'message': 'start_date and end_date query params are required.'}), 400

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date   = datetime.strptime(end_date_str,   '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    if end_date < start_date:
        return jsonify({'message': 'end_date must be on or after start_date.'}), 400

    try:
        deleted = (
            db.session.query(ShiftAllocation)
            .filter(
                ShiftAllocation.date >= start_date,
                ShiftAllocation.date <= end_date
            )
            .delete(synchronize_session=False)
        )
        db.session.commit()
        return jsonify({
            'message': f'Deleted {deleted} allocation(s) between {start_date_str} and {end_date_str}.',
            'deleted': deleted
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'message': 'Failed to delete allocations.', 'error': str(exc)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# PDF Report Download
# ─────────────────────────────────────────────────────────────────────────────

@shift_bp.route('/report/pdf', methods=['GET'])
@jwt_required()
@role_required(['admin', 'manager'])
def download_shift_pdf():
    """
    Generates and downloads a PDF report for shift allocations.
    Query params: start_date, end_date  (YYYY-MM-DD)
    """
    start_date_str = request.args.get('start_date', '').strip()
    end_date_str = request.args.get('end_date', '').strip()

    if not start_date_str or not end_date_str:
        return jsonify({'message': 'start_date and end_date query params are required.'}), 400

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date   = datetime.strptime(end_date_str,   '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    if end_date < start_date:
        return jsonify({'message': 'end_date must be on or after start_date.'}), 400

    try:
        allocations = ShiftAllocation.query.filter(
            ShiftAllocation.date >= start_date,
            ShiftAllocation.date <= end_date
        ).order_by(ShiftAllocation.date.asc()).all()

        if not allocations:
            return jsonify({'message': 'No allocations found for the specified date range.'}), 404

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_name = f"shift_report_{timestamp}"
        filepath = ReportGenerator.generate_shift_pdf(allocations, report_name)

        if not os.path.exists(filepath):
            return jsonify({'message': 'Failed to generate PDF report.'}), 500

        return send_file(
            filepath,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"{report_name}.pdf"
        )
    except Exception as exc:
        return jsonify({'message': 'Failed to generate PDF report.', 'error': str(exc)}), 500
