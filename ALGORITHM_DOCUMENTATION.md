# Shift Roster Allocation Algorithm

## Overview
The Shift Management System uses a **Round-Robin Cohort Allocation Algorithm** to automatically assign shifts to employees. This algorithm is designed for speed and simplicity while ensuring fair distribution.

## Algorithm Steps

### 1. Employee Selection
- Fetches all active employees from the database
- Validates that at least 3 shifts exist (Morning, Evening, Night)
- Returns error if no active employees or insufficient shifts

### 2. Employee Sorting
- Employees are sorted by their ID for consistent round-robin allocation
- This ensures the same employees get the same shift patterns each week

### 3. Cohort Division
- Active employees are divided into 3 equal cohorts:
  - **Night Cohort**: First 1/3 of employees
  - **Evening Cohort**: Middle 1/3 of employees  
  - **Morning Cohort**: Remaining employees (including any remainder)
- If fewer than 3 employees, they are spread across available cohorts

### 4. Week Processing
- Processes 7 days (Monday through Sunday)
- Saturday and Sunday are treated as weekends (no shifts assigned)
- For each weekday, assigns shifts to each cohort:
  - Night cohort → Night shift
  - Evening cohort → Evening shift
  - Morning cohort → Morning shift

### 5. Bulk Operations
- Clears existing allocations for the target week
- Bulk inserts all new allocations in a single database operation
- Commits changes to database

### 6. Email Notifications
- Sends email notifications to employees about their new assignments
- Email sending is non-blocking (doesn't slow down allocation)
- Skips email if SMTP is not configured

## Performance Optimizations

1. **No Leave Processing**: Leave checking is disabled for maximum speed
2. **No Historical Workload**: Historical shift counts are not calculated
3. **No Conflict Guards**: Night-to-morning conflict prevention is disabled
4. **Bulk Database Operations**: Uses bulk delete and insert operations
5. **Simplified Logic**: Round-robin instead of complex workload balancing

## Algorithm Characteristics

**Time Complexity**: O(n) where n is number of employees × 5 workdays
**Space Complexity**: O(n) for storing allocations before bulk insert
**Performance**: Typically completes in under 2 seconds for 50+ employees

## Trade-offs

**Simplified for Speed**:
- No leave conflict detection
- No historical workload balancing
- No consecutive shift conflict prevention
- Simple round-robin distribution

**Benefits**:
- Extremely fast allocation
- Predictable shift patterns
- Fair distribution across cohorts
- Minimal database queries

## Example

For 53 employees:
- Night cohort: 17 employees (first 1/3)
- Evening cohort: 17 employees (middle 1/3)
- Morning cohort: 19 employees (remaining + remainder)

Each weekday:
- 17 employees get Night shift
- 17 employees get Evening shift
- 19 employees get Morning shift
- Total: 53 allocations per day × 5 days = 265 allocations per week
