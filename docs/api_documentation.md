# Flask API Routes Documentation

This document describes all API endpoints exposed by the backend Flask service of the Shift & Attendance Management System. All endpoints require the `Authorization: Bearer <JWT_TOKEN>` header unless specified otherwise.

---

## Authentication & Authorization

### 1. User Login
* **Endpoint**: `POST /api/auth/login`
* **Auth Required**: No (Public)
* **Payload**:
  ```json
  {
    "email": "admin@shiftmanagement.com",
    "password": "AdminPassword123"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "admin@shiftmanagement.com",
      "role": "admin",
      "employee_id": "EMP-2026-0001",
      "name": "System Administrator"
    }
  }
  ```

### 2. Session Fetch (Me)
* **Endpoint**: `GET /api/auth/me`
* **Success Response (200 OK)**:
  ```json
  {
    "id": 1,
    "email": "admin@shiftmanagement.com",
    "role": "admin",
    "employee_id": "EMP-2026-0001",
    "name": "System Administrator"
  }
  ```

---

## Employee Management

### 1. List Employees
* **Endpoint**: `GET /api/employees`
* **Role Restrict**: `admin`
* **Success Response (200 OK)**:
  ```json
  [
    {
      "id": "EMP-2026-0001",
      "user_id": 1,
      "email": "admin@shiftmanagement.com",
      "first_name": "System",
      "last_name": "Administrator",
      "phone": "+15550199",
      "department_id": 1,
      "department_name": "Engineering",
      "role_id": 1,
      "role_name": "Senior Engineer",
      "hire_date": "2026-01-01",
      "status": "active",
      "created_at": "2026-06-22T04:19:41"
    }
  ]
  ```

### 2. Add Employee
* **Endpoint**: `POST /api/employees`
* **Role Restrict**: `admin`
* **Payload**:
  ```json
  {
    "email": "john.doe@shiftmanagement.com",
    "password": "SecurePassword123",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+15550244",
    "department_id": 1,
    "role_id": 1,
    "hire_date": "2026-06-22"
  }
  ```
* **Success Response (201 Created)**: Employee profile with auto-generated ID.

---

## Shift Management

### 1. Fetch Weekly Allocations
* **Endpoint**: `GET /api/shifts/allocations`
* **Parameters**: `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD)
* **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "employee_id": "EMP-2026-0001",
      "employee_name": "System Administrator",
      "shift_id": 1,
      "shift_name": "Morning",
      "shift_color": "#F59E0B",
      "date": "2026-06-22",
      "created_at": "2026-06-22T04:20:00"
    }
  ]
  ```

### 2. Auto Weekly Allocation
* **Endpoint**: `POST /api/shifts/allocations/auto`
* **Role Restrict**: `admin`
* **Payload**:
  ```json
  {
    "start_date": "2026-06-22"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "message": "Successfully allocated 5 shifts for the week starting 2026-06-22"
  }
  ```

### 3. Manual Override Assignment
* **Endpoint**: `POST /api/shifts/allocations/manual`
* **Role Restrict**: `admin`
* **Payload**:
  ```json
  {
    "employee_id": "EMP-2026-0001",
    "shift_id": 2,
    "date": "2026-06-22"
  }
  ```

---

## Attendance Management

### 1. Clock In
* **Endpoint**: `POST /api/attendance/clock-in`
* **Success Response (200 OK)**:
  ```json
  {
    "id": 5,
    "employee_id": "EMP-2026-0001",
    "date": "2026-06-22",
    "clock_in": "2026-06-22T08:05:22",
    "clock_out": null,
    "status": "present",
    "correction_requested": false
  }
  ```

### 2. Clock Out
* **Endpoint**: `POST /api/attendance/clock-out`

### 3. Submit Attendance Correction
* **Endpoint**: `POST /api/attendance/correction`
* **Payload**:
  ```json
  {
    "date": "2026-06-18",
    "clock_in": "2026-06-18T09:00:00",
    "clock_out": "2026-06-18T17:00:00",
    "reason": "Forgot to clock out"
  }
  ```

---

## Leave Requests

### 1. Submit Leave Request
* **Endpoint**: `POST /api/leaves`
* **Payload**:
  ```json
  {
    "leave_type": "sick",
    "start_date": "2026-06-24",
    "end_date": "2026-06-25",
    "reason": "Medical surgery"
  }
  ```

### 2. Resolve Leave Request
* **Endpoint**: `POST /api/leaves/<int:leave_id>/resolve`
* **Role Restrict**: `admin`
* **Payload**:
  ```json
  {
    "action": "approved",
    "comments": "Approved. Stay safe."
  }
  ```

---

## Reports & Document Compilation

### 1. Compile Report
* **Endpoint**: `POST /api/reports/generate`
* **Role Restrict**: `admin`
* **Payload**:
  ```json
  {
    "type": "attendance",
    "format": "pdf",
    "start_date": "2026-06-01",
    "end_date": "2026-06-22"
  }
  ```

### 2. Download Binary Report
* **Endpoint**: `GET /api/reports/download/<int:report_id>`
* **Role Restrict**: `admin`
* **Response**: Binary file stream (`application/pdf` or `.xlsx` mime-type)
