from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_current_user
from app.backend.models.attendance import Attendance
from app.backend.models.shift import ShiftAllocation
from app.backend.models.employee import Employee
from app.backend.extensions import db
from app.backend.middleware import role_required
from app.backend.services.report_generator import ReportGenerator
from datetime import datetime
import os

report_bp = Blueprint('report', __name__)

class ReportModel(db.Model):
    """
    Mapping to database reports table.
    We define it here inline since it's only used inside this controller service.
    """
    __tablename__ = 'reports'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    type = db.Column(db.Enum('shift', 'attendance', 'workforce', name='report_types'), nullable=False)
    filepath = db.Column(db.String(255), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'filepath': self.filepath,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

@report_bp.route('', methods=['GET'])
@jwt_required()
@role_required(['admin', 'manager'])
def list_reports():
    """Lists all compiled report history logs"""
    reports = ReportModel.query.order_by(ReportModel.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reports]), 200

@report_bp.route('/generate', methods=['POST'])
@jwt_required()
@role_required(['admin', 'manager'])
def generate_report():
    """Compiles matching data structures, creates a file, and indexes it in the DB"""
    user = get_current_user()
    data = request.get_json() or {}
    report_type = data.get('type') # 'shift' or 'attendance'
    file_format = data.get('format') # 'excel' or 'pdf'
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')

    if not all([report_type, file_format, start_date_str, end_date_str]):
        return jsonify({'message': 'Type, format, start date and end date are required'}), 400

    if report_type not in ['shift', 'attendance']:
        return jsonify({'message': 'Invalid report type'}), 400

    if file_format not in ['excel', 'pdf']:
        return jsonify({'message': 'Invalid file format'}), 400

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid dates or formats supplied'}), 400

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_name = f"{report_type}_report_{timestamp}"
    filepath = ""

    try:
        if report_type == 'shift':
            allocations = ShiftAllocation.query.filter(
                ShiftAllocation.date >= start_date,
                ShiftAllocation.date <= end_date
            ).order_by(ShiftAllocation.date.asc()).all()

            if file_format == 'excel':
                filepath = ReportGenerator.generate_shift_excel(allocations, report_name)
            else:
                filepath = ReportGenerator.generate_shift_pdf(allocations, report_name)

        elif report_type == 'attendance':
            records = Attendance.query.filter(
                Attendance.date >= start_date,
                Attendance.date <= end_date
            ).order_by(Attendance.date.asc()).all()

            if file_format == 'excel':
                filepath = ReportGenerator.generate_attendance_excel(records, report_name)
            else:
                filepath = ReportGenerator.generate_attendance_pdf(records, report_name)

        # Index report in database
        report = ReportModel(
            name=f"{report_name}.{'xlsx' if file_format == 'excel' else 'pdf'}",
            type=report_type,
            filepath=filepath,
            created_by=user.id
        )
        db.session.add(report)
        db.session.commit()

        return jsonify(report.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to compile report details', 'error': str(e)}), 500

@report_bp.route('/download/<int:report_id>', methods=['GET'])
@jwt_required()
@role_required(['admin', 'manager'])
def download_report(report_id):
    """Streams the requested file from the disk to the client"""
    report = ReportModel.query.get(report_id)
    if not report:
        return jsonify({'message': 'Report log not found'}), 404

    if not os.path.exists(report.filepath):
        return jsonify({'message': 'File no longer exists on the server'}), 404

    # Determine mime-type
    mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' if report.filepath.endswith('.xlsx') else 'application/pdf'
    
    return send_file(
        report.filepath,
        mimetype=mimetype,
        as_attachment=True,
        download_name=report.name
    )
