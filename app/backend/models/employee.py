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
        
        # Get all matching IDs to find the true numeric maximum suffix
        emp_ids = db.session.query(Employee.id).filter(Employee.id.like(f"{prefix}%")).all()
        
        max_number = 0
        for (emp_id,) in emp_ids:
            try:
                last_num = int(emp_id.split('-')[-1])
                if last_num > max_number:
                    max_number = last_num
            except (ValueError, IndexError):
                continue
                
        new_number = max_number + 1
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
