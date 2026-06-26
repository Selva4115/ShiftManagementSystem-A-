from app.backend.extensions import db
from datetime import datetime

class Employee(db.Model):
    __tablename__ = 'employees'

    id = db.Column(db.String(20), primary_key=True)  # Format: EMP-YYYY-XXXX
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='SET NULL'))
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id', ondelete='SET NULL'))
    hire_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    status = db.Column(db.Enum('active', 'inactive', name='employee_status'), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    shift_allocations = db.relationship('ShiftAllocation', backref='employee', cascade="all, delete-orphan")
    attendance_records = db.relationship('Attendance', backref='employee', cascade="all, delete-orphan")
    leave_requests = db.relationship('LeaveRequest', backref='employee', cascade="all, delete-orphan")

    @staticmethod
    def generate_id():
        current_year = datetime.utcnow().year
        prefix = f"EMP-{current_year}-"
        
        # Get all IDs starting with prefix to find the max suffix
        latest_employee = Employee.query.filter(Employee.id.like(f"{prefix}%")).order_by(Employee.id.desc()).first()
        
        if latest_employee:
            try:
                last_number = int(latest_employee.id.split('-')[-1])
                new_number = last_number + 1
            except (ValueError, IndexError):
                new_number = 1
        else:
            new_number = 1
            
        return f"{prefix}{new_number:04d}"

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'email': self.user.email if self.user else None,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'role_id': self.role_id,
            'role_name': self.role_profile.name if self.role_profile else None,
            'hire_date': self.hire_date.isoformat() if self.hire_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
