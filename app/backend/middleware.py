from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_current_user
from app.backend.models.user import User

def role_required(allowed_roles):
    """
    Decorator to restrict access to endpoints based on user roles.
    Allowed roles: 'admin', 'employee'
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception as e:
                return jsonify({'message': 'Authentication token missing or invalid', 'error': str(e)}), 401
            
            user = get_current_user()
            if not user:
                return jsonify({'message': 'User profile not found'}), 401
                
            if user.role not in allowed_roles:
                return jsonify({'message': f'Access denied. Requires role: {allowed_roles}'}), 403
                
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def handle_api_error(err):
    """Generic error handler for API endpoints"""
    response = {
        'message': 'An unexpected error occurred on the server.',
        'error': str(err)
    }
    return jsonify(response), 500
