from app.backend.extensions import db
from datetime import datetime

class LeaveRequest(db.Model):
    __tablename__ = 'leave_requests'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False)
    leave_type = db.Column(db.Enum('sick', 'casual', 'earned', 'unpaid', name='leave_types'), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.Enum('pending', 'approved', 'rejected', name='leave_status'), default='pending')
    comments = db.Column(db.Text, nullable=True)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': f"{self.employee.first_name} {self.employee.last_name}" if self.employee else None,
            'leave_type': self.leave_type,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'reason': self.reason,
            'status': self.status,
            'comments': self.comments,
            'approved_by': self.approved_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
