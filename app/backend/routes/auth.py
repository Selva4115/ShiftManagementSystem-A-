from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_current_user
from app.backend.models.user import User
from app.backend.models.employee import Employee
from app.backend.extensions import db, jwt

auth_bp = Blueprint('auth', __name__)

@jwt.user_identity_loader
def user_identity_lookup(user):
    return str(user.id)

@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    identity = jwt_data["sub"]
    return User.query.filter_by(id=int(identity)).first()

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticates a user and returns a JWT access token"""
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid email or password'}), 401

    # Fetch employee profile details if present
    emp_profile = user.employee_profile
    emp_id = emp_profile.id if emp_profile else None
    first_name = emp_profile.first_name if emp_profile else "System"
    last_name = emp_profile.last_name if emp_profile else "Admin"

    access_token = create_access_token(identity=user)
    return jsonify({
        'token': access_token,
        'user': {
            'id': user.id,
            'email': user.email,
            'role': user.role,
            'employee_id': emp_id,
            'name': f"{first_name} {last_name}"
        }
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """Returns the details of the currently authenticated user"""
    user = get_current_user()
    if not user:
        return jsonify({'message': 'User session not found'}), 404

    emp_profile = user.employee_profile
    emp_id = emp_profile.id if emp_profile else None
    first_name = emp_profile.first_name if emp_profile else "System"
    last_name = emp_profile.last_name if emp_profile else "Admin"

    return jsonify({
        'id': user.id,
        'email': user.email,
        'role': user.role,
        'employee_id': emp_id,
        'name': f"{first_name} {last_name}"
    }), 200

@auth_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """Retrieves all system notification alerts for the current logged in user"""
    user = get_current_user()
    if not user:
        return jsonify({'message': 'User session not found'}), 404

    from app.backend.models.notification import Notification
    notes = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).all()
    return jsonify([n.to_dict() for n in notes]), 200

@auth_bp.route('/notifications/<int:note_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(note_id):
    """Marks a target notification as read"""
    user = get_current_user()
    if not user:
        return jsonify({'message': 'User session not found'}), 404

    from app.backend.models.notification import Notification
    note = Notification.query.filter_by(id=note_id, user_id=user.id).first()
    if not note:
        return jsonify({'message': 'Notification not found'}), 404

    note.is_read = True
    try:
        db.session.commit()
        return jsonify(note.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to update notification', 'error': str(e)}), 500

