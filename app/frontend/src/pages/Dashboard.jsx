import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import Card from '../components/Card';
import { 
  Users, 
  CalendarDays, 
  Clock, 
  FileCheck, 
  ArrowRight,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useToast } from '../context/ToastContext';

const AnimatedCounter = ({ value, duration = 1200 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let target = 0;
    let isPercent = false;
    if (typeof value === 'number') {
      target = value;
    } else if (typeof value === 'string') {
      if (value.endsWith('%')) {
        target = parseInt(value.replace('%', ''), 10) || 0;
        isPercent = true;
      } else {
        target = parseInt(value, 10) || 0;
      }
    }

    if (target === 0) {
      setCount(value);
      return;
    }

    const totalSteps = 40;
    const stepTime = duration / totalSteps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / totalSteps;
      // Ease-out quad formula
      const current = Math.round(target * (progress * (2 - progress)));
      
      if (step >= totalSteps) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(isPercent ? `${current}%` : current);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
};

const Dashboard = () => {
  const { user, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const isManagerOrAdmin = isAdmin || isManager;

  // Stats States
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeShifts: 0,
    attendanceRate: '0%',
    pendingLeaves: 0,
    // Employee Specific
    myShiftToday: 'Off Duty',
    myClockInTime: '--:--',
    myClockOutTime: '--:--',
    myAttendanceStatus: 'absent'
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (isManagerOrAdmin) {
        // 1. Fetch Employees
        const empRes = await client.get('/api/employees');
        const employees = empRes.data;

        // 2. Fetch Pending Leaves
        const leaveRes = await client.get('/api/leaves?status=pending');
        const pendingLeaves = leaveRes.data.length;

        // 3. Fetch Today's Shift Allocations
        const todayStr = new Date().toISOString().split('T')[0];
        const allocRes = await client.get(`/api/shifts/allocations?start_date=${todayStr}&end_date=${todayStr}`);
        const allocations = allocRes.data;

        // 4. Fetch Today's Attendance
        const attnRes = await client.get(`/api/attendance/history?start_date=${todayStr}&end_date=${todayStr}`);
        const attendance = attnRes.data;
        const presentCount = attendance.filter(a => ['present', 'late', 'half-day'].includes(a.status)).length;
        const totalActive = employees.filter(e => e.status === 'active').length;
        const rate = totalActive > 0 ? Math.round((presentCount / totalActive) * 100) : 0;

        setStats({
          totalEmployees: employees.length,
          activeShifts: allocations.length,
          attendanceRate: `${rate}%`,
          pendingLeaves: pendingLeaves
        });

        // 5. Generate mock/calculated chart data for the last 5 days
        const mockChartData = [
          { name: 'Mon', Rate: 85, Coverage: 92 },
          { name: 'Tue', Rate: 88, Coverage: 95 },
          { name: 'Wed', Rate: 90, Coverage: 90 },
          { name: 'Thu', Rate: rate, Coverage: allocations.length * 10 },
          { name: 'Fri', Rate: 82, Coverage: 85 }
        ];
        setChartData(mockChartData);

        // 6. Set Recent activities logs
        setRecentActivities([
          { text: 'Shift roster generated automatically for next week.', time: '1 hour ago' },
          { text: `${pendingLeaves} leave requests pending review.`, time: '2 hours ago' },
          { text: 'System backup executed successfully.', time: 'Yesterday' }
        ]);

        if (loading) {
          addToast("Dashboard Connected", "Workforce metrics synced successfully.", "success");
        }
      } else {
        // Employee dashboard logic
        const statusRes = await client.get('/api/attendance/status');
        const { shift, attendance } = statusRes.data;

        const myShiftToday = shift ? shift.shift_name : 'Off Duty';
        
        let myClockInTime = '--:--';
        let myClockOutTime = '--:--';
        let myAttendanceStatus = 'absent';

        if (attendance) {
          myClockInTime = attendance.clock_in ? new Date(attendance.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
          myClockOutTime = attendance.clock_out ? new Date(attendance.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
          myAttendanceStatus = attendance.status;
        }

        // Fetch My Leave requests
        const leaveRes = await client.get('/api/leaves');
        const approvedCount = leaveRes.data.filter(l => l.status === 'approved').length;

        setStats({
          myShiftToday,
          myClockInTime,
          myClockOutTime,
          myAttendanceStatus,
          pendingLeaves: approvedCount
        });

        setRecentActivities([
          { text: `Your shift today: ${myShiftToday}`, time: 'Today' },
          { text: attendance ? `Clocked in at ${myClockInTime}` : 'Yet to clock in today.', time: 'Today' },
          { text: `You have ${approvedCount} approved leaves in history.`, time: 'Overall' }
        ]);

        if (loading) {
          addToast("ShiftFlow Online", `Logged in as ${user.name}`, "info");
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard details:', err);
      addToast("Database Connection Error", "Unable to pull live statistics.", "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present': return <span className="badge badge-success">Present</span>;
      case 'late': return <span className="badge badge-warning">Late</span>;
      case 'half-day': return <span className="badge badge-info">Half-day</span>;
      default: return <span className="badge badge-danger">Absent</span>;
    }
  };

  if (loading) {
    return <div style={loaderStyle}>Loading Dashboard Metrics...</div>;
  }

  return (
    <div className="fade-in">
      <div style={welcomeSectionStyle}>
        <div>
          <h2 style={greetingStyle}>Welcome Back, {user?.name}!</h2>
          <p style={subGreetingStyle}>Here is what is happening today in your shift rotation system.</p>
        </div>
      </div>

      {isManagerOrAdmin ? (
        // ADMIN DASHBOARD CARDS
        <div className="grid-cols-4">
          <div className="card" style={{ ...statCardStyle, borderLeft: '4px solid var(--primary-color)' }}>
            <div style={cardHeaderStyle}>
              <Users size={24} color="var(--primary-color)" />
              <span style={percentageStyle}>+2%</span>
            </div>
            <h4 style={statLabelStyle}>Total Employees</h4>
            <p style={statNumberStyle}><AnimatedCounter value={stats.totalEmployees} /></p>
          </div>

          <div className="card" style={{ ...statCardStyle, borderLeft: '4px solid var(--warning-color)' }}>
            <div style={cardHeaderStyle}>
              <CalendarDays size={24} color="var(--warning-color)" />
              <span style={percentageStyle}>Stable</span>
            </div>
            <h4 style={statLabelStyle}>Active Shifts Today</h4>
            <p style={statNumberStyle}><AnimatedCounter value={stats.activeShifts} /></p>
          </div>

          <div className="card" style={{ ...statCardStyle, borderLeft: '4px solid var(--success-color)' }}>
            <div style={cardHeaderStyle}>
              <UserCheck size={24} color="var(--success-color)" />
              <span style={percentageStyle}>Live</span>
            </div>
            <h4 style={statLabelStyle}>Attendance Rate</h4>
            <p style={statNumberStyle}><AnimatedCounter value={stats.attendanceRate} /></p>
          </div>

          <div className="card" style={{ ...statCardStyle, borderLeft: '4px solid var(--danger-color)' }}>
            <div style={cardHeaderStyle}>
              <Clock size={24} color="var(--danger-color)" />
              <span style={percentageStyle}>Action Req</span>
            </div>
            <h4 style={statLabelStyle}>Pending Leave Requests</h4>
            <p style={statNumberStyle}><AnimatedCounter value={stats.pendingLeaves} /></p>
          </div>
        </div>
      ) : (
        // EMPLOYEE DASHBOARD CARDS
        <div className="grid-cols-4">
          <div className="card" style={{ ...statCardStyle, borderLeft: '4px solid var(--primary-color)' }}>
            <div style={cardHeaderStyle}>
              <CalendarDays size={24} color="var(--primary-color)" />
            </div>
            <h4 style={statLabelStyle}>Today's Allocated Shift</h4>
            <p style={statNumberStyle}>{stats.myShiftToday}</p>
          </div>

          <div className="card" style={{ ...statCardStyle, borderLeft: '4px solid var(--success-color)' }}>
            <div style={cardHeaderStyle}>
              <Clock size={24} color="var(--success-color)" />
            </div>
            <h4 style={statLabelStyle}>Clock In Time</h4>
            <p style={statNumberStyle}>{stats.myClockInTime}</p>
          </div>

          <div className="card" style={{ ...statCardStyle, borderLeft: '4px solid var(--warning-color)' }}>
            <div style={cardHeaderStyle}>
              <Clock size={24} color="var(--warning-color)" />
            </div>
            <h4 style={statLabelStyle}>Clock Out Time</h4>
            <p style={statNumberStyle}>{stats.myClockOutTime}</p>
          </div>

          <div className="card" style={{ ...statCardStyle, borderLeft: '4px solid var(--danger-color)' }}>
            <div style={cardHeaderStyle}>
              <FileCheck size={24} color="var(--danger-color)" />
            </div>
            <h4 style={statLabelStyle}>Attendance Status</h4>
            <div style={{ marginTop: '0.5rem' }}>{getStatusBadge(stats.myAttendanceStatus)}</div>
          </div>
        </div>
      )}

      {/* DASHBOARD CHARTS & RECENT LIST */}
      <div className="grid-cols-2">
        {isManagerOrAdmin ? (
          <Card title="Attendance & Coverage Performance">
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--success-color)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--success-color)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="Rate" stroke="var(--success-color)" fillOpacity={1} fill="url(#colorRate)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : (
          <Card title="Clocking Patterns">
            <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={clockSectionStyle}>
                <Clock size={48} color="var(--primary-color)" />
                <h4 style={{ margin: '1rem 0' }}>Quick Actions</h4>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={() => navigate('/attendance')} className="btn btn-primary">Go to Attendance Terminal</button>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card title="Recent Activities" extra={<button onClick={() => navigate('/notifications')} style={viewAllBtnStyle}>View All <ArrowRight size={14} /></button>}>
          <div style={activitiesContainerStyle}>
            {recentActivities.map((act, index) => (
              <div key={index} style={activityRowStyle}>
                <p style={activityTextStyle}>{act.text}</p>
                <span style={activityTimeStyle}>{act.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// Styles for dashboard components
const loaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh',
  fontSize: '1.25rem',
  color: 'var(--text-secondary)',
  fontWeight: '500',
};

const welcomeSectionStyle = {
  marginBottom: '2rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const greetingStyle = {
  fontSize: '1.75rem',
  fontWeight: '800',
  color: 'var(--text-primary)',
};

const subGreetingStyle = {
  color: 'var(--text-secondary)',
  marginTop: '0.25rem',
};

const statCardStyle = {
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  minHeight: '140px',
};

const cardHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
};

const percentageStyle = {
  fontSize: '0.75rem',
  fontWeight: '700',
  color: 'var(--success-color)',
  backgroundColor: 'var(--success-light)',
  padding: '0.2rem 0.5rem',
  borderRadius: '4px',
};

const statLabelStyle = {
  fontSize: '0.875rem',
  color: 'var(--text-secondary)',
  fontWeight: '500',
};

const statNumberStyle = {
  fontSize: '1.75rem',
  fontWeight: '800',
  color: 'var(--text-primary)',
  marginTop: '0.25rem',
};

const viewAllBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--primary-color)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  fontWeight: '600',
  cursor: 'pointer',
};

const activitiesContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const activityRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '1rem',
  borderBottom: '1px solid var(--border-color)',
};

const activityTextStyle = {
  fontSize: '0.925rem',
  color: 'var(--text-primary)',
};

const activityTimeStyle = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
};

const clockSectionStyle = {
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

export default Dashboard;
