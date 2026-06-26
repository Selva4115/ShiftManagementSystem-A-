from app.backend.extensions import db
from datetime import datetime

class Attendance(db.Model):
    __tablename__ = 'attendance'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    clock_in = db.Column(db.DateTime, nullable=True)
    clock_out = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.Enum('present', 'absent', 'half-day', 'late', name='attendance_status'), default='absent')
    
    # Correction fields
    correction_requested = db.Column(db.Boolean, default=False)
    correction_reason = db.Column(db.Text, nullable=True)
    correction_clock_in = db.Column(db.DateTime, nullable=True)
    correction_clock_out = db.Column(db.DateTime, nullable=True)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('employee_id', 'date', name='unique_emp_attendance_date'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': f"{self.employee.first_name} {self.employee.last_name}" if self.employee else None,
            'date': self.date.isoformat() if self.date else None,
            'clock_in': self.clock_in.isoformat() if self.clock_in else None,
            'clock_out': self.clock_out.isoformat() if self.clock_out else None,
            'status': self.status,
            'correction_requested': self.correction_requested,
            'correction_reason': self.correction_reason,
            'correction_clock_in': self.correction_clock_in.isoformat() if self.correction_clock_in else None,
            'correction_clock_out': self.correction_clock_out.isoformat() if self.correction_clock_out else None,
            'approved_by': self.approved_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
