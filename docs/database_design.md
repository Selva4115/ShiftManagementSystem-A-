# MySQL Database Design & DDL Schema

This document contains the MySQL schema script required to initialize the database for the Automatic Weekly Shift Allocation & Attendance Management System, along with explanations of the tables, keys, and indexes.

## DDL Script

You can execute the following SQL script in MySQL Workbench or your favorite MySQL client to set up the database.

```sql
-- Create Database if not exists
CREATE DATABASE IF NOT EXISTS shift_db;
USE shift_db;

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Job Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Users Table (Authentication Details)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Employees Table (Profile Details)
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(20) PRIMARY KEY, -- Format: EMP-YYYY-XXXX
    user_id INT UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    department_id INT,
    role_id INT,
    hire_date DATE NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL,
    INDEX idx_employee_status (status),
    INDEX idx_employee_names (first_name, last_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Shifts Table (Definition of standard shifts)
CREATE TABLE IF NOT EXISTS shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name ENUM('Morning', 'Evening', 'Night') UNIQUE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    color_code VARCHAR(7) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Shift Allocations Table
CREATE TABLE IF NOT EXISTS shift_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    shift_id INT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    UNIQUE KEY unique_emp_date (employee_id, date),
    INDEX idx_allocation_date (date),
    INDEX idx_emp_date_allocation (employee_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    clock_in DATETIME DEFAULT NULL,
    clock_out DATETIME DEFAULT NULL,
    status ENUM('present', 'absent', 'half-day', 'late') DEFAULT 'absent',
    correction_requested BOOLEAN DEFAULT FALSE,
    correction_reason TEXT DEFAULT NULL,
    correction_clock_in DATETIME DEFAULT NULL,
    correction_clock_out DATETIME DEFAULT NULL,
    approved_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_emp_attn_date (employee_id, date),
    INDEX idx_attendance_date (date),
    INDEX idx_emp_date_attendance (employee_id, date),
    INDEX idx_correction_req (correction_requested)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    leave_type ENUM('sick', 'casual', 'earned', 'unpaid') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    comments TEXT DEFAULT NULL,
    approved_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_leave_emp (employee_id),
    INDEX idx_leave_dates (start_date, end_date),
    INDEX idx_leave_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notification_user (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Reports Table (Keeps track of exported reports meta)
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('shift', 'attendance', 'workforce') NOT NULL,
    filepath VARCHAR(255) NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Seed Data

To populate standard roles, departments, and shifts for initial login and system testing, run this script:

```sql
-- Seed Departments
INSERT INTO departments (name, description) VALUES
('Human Resources', 'Handles staffing, recruitment, and employee relations'),
('Engineering', 'Software development and technical operations'),
('Support', 'Customer success and service desk');

-- Seed Job Roles
INSERT INTO roles (name, description) VALUES
('HR Manager', 'Manages HR department tasks'),
('Senior Software Engineer', 'Leads software development tasks'),
('Support Agent', 'Resolves client issues');

-- Seed Default Admin User
-- Default password: AdminPassword123 (hashed using bcrypt/pbkdf2_sha256)
-- Pre-hashed value for testing: $2b$12$pG0jIqX0ZgDkP0iV597iOe.18dK56XkGjM4h4Kk6qG2aFxeH4FmFq (which resolves to AdminPassword123)
INSERT INTO users (email, password_hash, role) VALUES
('admin@shiftmanagement.com', '$2b$12$pG0jIqX0ZgDkP0iV597iOe.18dK56XkGjM4h4Kk6qG2aFxeH4FmFq', 'admin');

-- Create employee profile for Admin user (optional/required for matching relationships)
INSERT INTO employees (id, user_id, first_name, last_name, phone, department_id, role_id, hire_date, status) VALUES
('EMP-2026-0001', 1, 'System', 'Administrator', '+15550199', 1, 1, '2026-01-01', 'active');

-- Seed Default Shifts
INSERT INTO shifts (name, start_time, end_time, color_code) VALUES
('Morning', '06:00:00', '14:00:00', '#F59E0B'), -- Vibrant Amber
('Evening', '14:00:00', '22:00:00', '#3B82F6'), -- Vibrant Blue
('Night', '22:00:00', '06:00:00', '#10B981');   -- Vibrant Emerald
```
