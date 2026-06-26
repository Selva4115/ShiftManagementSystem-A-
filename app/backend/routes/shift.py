from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.backend.models.shift import Shift, ShiftAllocation
from app.backend.models.employee import Employee
from app.backend.extensions import db
from app.backend.middleware import role_required
from app.backend.services.shift_scheduler import ShiftScheduler
from datetime import datetime

shift_bp = Blueprint('shift', __name__)

@shift_bp.route('', methods=['GET'])
@jwt_required()
def list_shifts():
    """Returns all standard shifts in the database"""
    shifts = Shift.query.all()
    return jsonify([s.to_dict() for s in shifts]), 200

@shift_bp.route('/allocations', methods=['GET'])
@jwt_required()
def list_allocations():
    """Returns allocations filtered by a date range (start_date to end_date)"""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    employee_id = request.args.get('employee_id')

    query = ShiftAllocation.query

    if start_date_str:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        query = query.filter(ShiftAllocation.date >= start_date)
    if end_date_str:
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        query = query.filter(ShiftAllocation.date <= end_date)
    if employee_id:
        query = query.filter(ShiftAllocation.employee_id == employee_id)

    allocations = query.all()
    return jsonify([a.to_dict() for a in allocations]), 200

@shift_bp.route('/allocations/auto', methods=['POST'])
@jwt_required()
@role_required(['admin', 'manager'])
def run_auto_allocation():
    """Triggers the weekly shift rotation algorithm for the specified Monday start date"""
    data = request.get_json() or {}
    start_date_str = data.get('start_date')

    if not start_date_str:
        return jsonify({'message': 'Start date parameter (YYYY-MM-DD) is required'}), 400

    try:
        # Check if the date is actually a Monday
        date_obj = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        if date_obj.weekday() != 0:
            return jsonify({'message': 'Automatic weekly allocation must start on a Monday'}), 400
    except ValueError:
        return jsonify({'message': 'Invalid date format. Expected YYYY-MM-DD'}), 400

    result = ShiftScheduler.allocate_weekly_shifts(start_date_str)
    if result['status'] == 'error':
        return jsonify({'message': result['message']}), 500

    return jsonify({'message': result['message']}), 200

@shift_bp.route('/allocations/manual', methods=['POST'])
@jwt_required()
@role_required(['admin', 'manager'])
def create_manual_allocation():
    """Manually assigns or overrides an employee's shift for a specific date"""
    data = request.get_json() or {}
    employee_id = data.get('employee_id')
    shift_id = data.get('shift_id')
    date_str = data.get('date')

    if not all([employee_id, shift_id, date_str]):
        return jsonify({'message': 'Employee ID, Shift ID, and date are required'}), 400

    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Expected YYYY-MM-DD'}), 400

    # Verify shift and employee exist
    shift = Shift.query.get(shift_id)
    if not shift:
        return jsonify({'message': 'Shift does not exist'}), 404
        
    employee = Employee.query.get(employee_id)
    if not employee:
        return jsonify({'message': 'Employee does not exist'}), 404

    # Save or update allocation
    allocation = ShiftAllocation.query.filter_by(employee_id=employee_id, date=date_obj).first()
    
    if allocation:
        allocation.shift_id = shift_id
    else:
        allocation = ShiftAllocation(
            employee_id=employee_id,
            shift_id=shift_id,
            date=date_obj
        )
        db.session.add(allocation)

    try:
        db.session.commit()
        return jsonify(allocation.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to save manual allocation', 'error': str(e)}), 500
