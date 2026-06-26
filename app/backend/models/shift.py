from app.backend.extensions import db
from datetime import datetime

class Shift(db.Model):
    __tablename__ = 'shifts'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Enum('Morning', 'Evening', 'Night', name='shift_names'), unique=True, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    color_code = db.Column(db.String(7), nullable=False)  # Hex color, e.g. #3B82F6
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    allocations = db.relationship('ShiftAllocation', backref='shift', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'start_time': self.start_time.strftime('%H:%M:%S') if self.start_time else None,
            'end_time': self.end_time.strftime('%H:%M:%S') if self.end_time else None,
            'color_code': self.color_code,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ShiftAllocation(db.Model):
    __tablename__ = 'shift_allocations'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False)
    shift_id = db.Column(db.Integer, db.ForeignKey('shifts.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Unique constraint to prevent an employee having multiple shifts on a single date
    __table_args__ = (
        db.UniqueConstraint('employee_id', 'date', name='unique_emp_date_allocation'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': f"{self.employee.first_name} {self.employee.last_name}" if self.employee else None,
            'shift_id': self.shift_id,
            'shift_name': self.shift.name if self.shift else None,
            'shift_color': self.shift.color_code if self.shift else None,
            'date': self.date.isoformat() if self.date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
