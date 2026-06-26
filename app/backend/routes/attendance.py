from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_current_user
from app.backend.models.attendance import Attendance
from app.backend.models.shift import ShiftAllocation
from app.backend.models.employee import Employee
from app.backend.extensions import db
from app.backend.middleware import role_required
from datetime import datetime, timedelta, date, time

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/status', methods=['GET'])
@jwt_required()
def get_today_status():
    """Returns today's clock-in status and shift details for the logged-in employee"""
    user = get_current_user()
    emp = user.employee_profile
    if not emp:
        return jsonify({'message': 'Employee profile not found'}), 404

    today = datetime.utcnow().date()
    
    # Fetch today's shift allocation
    alloc = ShiftAllocation.query.filter_by(employee_id=emp.id, date=today).first()
    shift_info = alloc.to_dict() if alloc else None

    # Fetch today's attendance record
    record = Attendance.query.filter_by(employee_id=emp.id, date=today).first()
    record_info = record.to_dict() if record else None

    return jsonify({
        'shift': shift_info,
        'attendance': record_info
    }), 200

@attendance_bp.route('/clock-in', methods=['POST'])
@jwt_required()
def clock_in():
    """Clocks in the employee for the day, evaluating status against scheduled shift"""
    user = get_current_user()
    emp = user.employee_profile
    if not emp:
        return jsonify({'message': 'Employee profile not found'}), 404

    now = datetime.now()
    today = now.date()

    # Check if already clocked in
    record = Attendance.query.filter_by(employee_id=emp.id, date=today).first()
    if record and record.clock_in:
        return jsonify({'message': 'Already clocked in for today'}), 400

    # Determine status (present vs late)
    status = 'present'
    alloc = ShiftAllocation.query.filter_by(employee_id=emp.id, date=today).first()
    
    if alloc:
        # Check grace period (15 minutes)
        shift_start = datetime.combine(today, alloc.shift.start_time)
        grace_time = shift_start + timedelta(minutes=15)
        if now > grace_time:
            status = 'late'

    if not record:
        record = Attendance(
            employee_id=emp.id,
            date=today,
            clock_in=now,
            status=status
        )
        db.session.add(record)
    else:
        record.clock_in = now
        record.status = status

    try:
        db.session.commit()
        return jsonify(record.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to clock in', 'error': str(e)}), 500

@attendance_bp.route('/clock-out', methods=['POST'])
@jwt_required()
def clock_out():
    """Clocks out the employee for the day"""
    user = get_current_user()
    emp = user.employee_profile
    if not emp:
        return jsonify({'message': 'Employee profile not found'}), 404

    now = datetime.now()
    today = now.date()

    record = Attendance.query.filter_by(employee_id=emp.id, date=today).first()
    if not record or not record.clock_in:
        return jsonify({'message': 'Must clock in before clocking out'}), 400
    
    if record.clock_out:
        return jsonify({'message': 'Already clocked out for today'}), 400

    record.clock_out = now
    
    # Calculate half-day logic (e.g. if hours worked < 4 hours)
    duration = record.clock_out - record.clock_in
    if duration.total_seconds() < 14400: # 4 hours
        record.status = 'half-day'

    try:
        db.session.commit()
        return jsonify(record.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to clock out', 'error': str(e)}), 500

@attendance_bp.route('/history', methods=['GET'])
@jwt_required()
def list_history():
    """Lists attendance logs filtered by range and employee (employees only see their own)"""
    user = get_current_user()
    
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    employee_id = request.args.get('employee_id')

    # Security rule: non-admins can only see their own history
    if user.role == 'employee':
        emp = user.employee_profile
        employee_id = emp.id if emp else 'none'

    query = Attendance.query

    if start_date_str:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        query = query.filter(Attendance.date >= start_date)
    if end_date_str:
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        query = query.filter(Attendance.date <= end_date)
    if employee_id and employee_id != 'all':
        query = query.filter(Attendance.employee_id == employee_id)

    records = query.order_by(Attendance.date.desc()).all()
    return jsonify([r.to_dict() for r in records]), 200

@attendance_bp.route('/correction', methods=['POST'])
@jwt_required()
def request_correction():
    """Allows an employee to request an attendance modification for a past date"""
    user = get_current_user()
    emp = user.employee_profile
    if not emp:
        return jsonify({'message': 'Employee profile not found'}), 404

    data = request.get_json() or {}
    date_str = data.get('date')
    correction_clock_in_str = data.get('clock_in')
    correction_clock_out_str = data.get('clock_out')
    reason = data.get('reason')

    if not all([date_str, correction_clock_in_str, correction_clock_out_str, reason]):
        return jsonify({'message': 'Date, correction clock in, correction clock out, and reason are required'}), 400

    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        corr_in = datetime.fromisoformat(correction_clock_in_str)
        corr_out = datetime.fromisoformat(correction_clock_out_str)
    except ValueError:
        return jsonify({'message': 'Invalid dates or formats supplied'}), 400

    # Retrieve or create attendance row
    record = Attendance.query.filter_by(employee_id=emp.id, date=target_date).first()
    if not record:
        record = Attendance(
            employee_id=emp.id,
            date=target_date,
            status='absent'
        )
        db.session.add(record)

    record.correction_requested = True
    record.correction_reason = reason
    record.correction_clock_in = corr_in
    record.correction_clock_out = corr_out

    try:
        db.session.commit()
        return jsonify(record.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to request correction', 'error': str(e)}), 500

@attendance_bp.route('/corrections/pending', methods=['GET'])
@jwt_required()
@role_required(['admin', 'manager'])
def list_pending_corrections():
    """Lists all pending attendance corrections for Admin review"""
    records = Attendance.query.filter_by(correction_requested=True).all()
    return jsonify([r.to_dict() for r in records]), 200

@attendance_bp.route('/corrections/<int:record_id>/resolve', methods=['POST'])
@jwt_required()
@role_required(['admin', 'manager'])
def resolve_correction(record_id):
    """Approves or rejects an employee's attendance correction request"""
    user = get_current_user()
    data = request.get_json() or {}
    action = data.get('action') # 'approve' or 'reject'

    if action not in ['approve', 'reject']:
        return jsonify({'message': 'Action must be either "approve" or "reject"'}), 400

    record = Attendance.query.get(record_id)
    if not record or not record.correction_requested:
        return jsonify({'message': 'Pending correction record not found'}), 404

    if action == 'approve':
        record.clock_in = record.correction_clock_in
        record.clock_out = record.correction_clock_out
        
        # Recalculate status based on duration
        duration = record.clock_out - record.clock_in
        if duration.total_seconds() >= 28800: # 8 hours
            record.status = 'present'
        elif duration.total_seconds() >= 14400: # 4 hours
            record.status = 'half-day'
        else:
            record.status = 'absent'

    # Clear correction request
    record.correction_requested = False
    record.correction_reason = None
    record.correction_clock_in = None
    record.correction_clock_out = None
    record.approved_by = user.id

    try:
        db.session.commit()
        return jsonify(record.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to resolve correction', 'error': str(e)}), 500
