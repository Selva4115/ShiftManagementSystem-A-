from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_current_user
from app.backend.models.leave import LeaveRequest
from app.backend.models.employee import Employee
from app.backend.extensions import db
from app.backend.middleware import role_required
from datetime import datetime

leave_bp = Blueprint('leave', __name__)

@leave_bp.route('', methods=['POST'])
@jwt_required()
def create_leave_request():
    """Allows an employee to request leaves"""
    user = get_current_user()
    emp = user.employee_profile
    if not emp:
        return jsonify({'message': 'Employee profile not found'}), 404

    data = request.get_json() or {}
    leave_type = data.get('leave_type')
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    reason = data.get('reason')

    if not all([leave_type, start_date_str, end_date_str, reason]):
        return jsonify({'message': 'Leave type, start date, end date, and reason are required'}), 400

    if leave_type not in ['sick', 'casual', 'earned', 'unpaid']:
        return jsonify({'message': 'Invalid leave type specified'}), 400

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        if start_date > end_date:
            return jsonify({'message': 'Start date must be before or equal to end date'}), 400
    except ValueError:
        return jsonify({'message': 'Invalid dates or formats supplied'}), 400

    leave = LeaveRequest(
        employee_id=emp.id,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        status='pending'
    )

    try:
        db.session.add(leave)
        db.session.commit()
        return jsonify(leave.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to save leave request', 'error': str(e)}), 500

@leave_bp.route('', methods=['GET'])
@jwt_required()
def list_leaves():
    """Retrieves leave requests (Employees see their own history, Admins see all requests)"""
    user = get_current_user()
    
    query = LeaveRequest.query
    
    if user.role == 'employee':
        emp = user.employee_profile
        employee_id = emp.id if emp else 'none'
        query = query.filter(LeaveRequest.employee_id == employee_id)
    else:
        # Optional filter for admin view
        employee_id = request.args.get('employee_id')
        status = request.args.get('status')
        if employee_id and employee_id != 'all':
            query = query.filter(LeaveRequest.employee_id == employee_id)
        if status and status != 'all':
            query = query.filter(LeaveRequest.status == status)

    leaves = query.order_by(LeaveRequest.created_at.desc()).all()
    return jsonify([l.to_dict() for l in leaves]), 200

@leave_bp.route('/<int:leave_id>/resolve', methods=['POST'])
@jwt_required()
@role_required(['admin', 'manager'])
def resolve_leave(leave_id):
    """Approves or rejects a leave request"""
    user = get_current_user()
    data = request.get_json() or {}
    action = data.get('action') # 'approved' or 'rejected'
    comments = data.get('comments')

    if action not in ['approved', 'rejected']:
        return jsonify({'message': 'Action must be "approved" or "rejected"'}), 400

    leave = LeaveRequest.query.get(leave_id)
    if not leave:
        return jsonify({'message': 'Leave request not found'}), 404

    if leave.status != 'pending':
        return jsonify({'message': 'Leave request has already been resolved'}), 400

    leave.status = action
    leave.comments = comments
    leave.approved_by = user.id

    try:
        # If approved, we can trigger shift re-scheduling if needed, or simply delete
        # the employee's shifts during the leave period to prevent conflict.
        if action == 'approved':
            from app.backend.models.shift import ShiftAllocation
            ShiftAllocation.query.filter(
                ShiftAllocation.employee_id == leave.employee_id,
                ShiftAllocation.date >= leave.start_date,
                ShiftAllocation.date <= leave.end_date
            ).delete()

        db.session.commit()
        return jsonify(leave.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to resolve leave request', 'error': str(e)}), 500
