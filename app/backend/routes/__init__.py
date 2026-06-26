from flask import Blueprint

def register_blueprints(app):
    from app.backend.routes.auth import auth_bp
    from app.backend.routes.employee import employee_bp
    from app.backend.routes.shift import shift_bp
    from app.backend.routes.attendance import attendance_bp
    from app.backend.routes.leave import leave_bp
    from app.backend.routes.report import report_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(employee_bp, url_prefix='/api/employees')
    app.register_blueprint(shift_bp, url_prefix='/api/shifts')
    app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
    app.register_blueprint(leave_bp, url_prefix='/api/leaves')
    app.register_blueprint(report_bp, url_prefix='/api/reports')
