import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import Card from '../components/Card';
import { Users, CalendarDays, Clock, FileCheck, ArrowRight, UserCheck, TrendingUp, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useToast } from '../context/ToastContext';

/* Animated counter */
const AnimatedCounter = ({ value, duration = 1000 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let target = 0, isPercent = false;
    if (typeof value === 'number') { target = value; }
    else if (typeof value === 'string') {
      if (value.endsWith('%')) { target = parseInt(value); isPercent = true; }
      else target = parseInt(value) || 0;
    }
    if (target === 0) { setCount(value); return; }
    let step = 0, steps = 40;
    const t = setInterval(() => {
      step++;
      const p = step / steps;
      const cur = Math.round(target * (p * (2 - p)));
      if (step >= steps) { setCount(value); clearInterval(t); }
      else setCount(isPercent ? `${cur}%` : cur);
    }, duration / steps);
    return () => clearInterval(t);
  }, [value]);
  return <span style={{ animation: 'counterUp 0.4s ease forwards' }}>{count}</span>;
};

const KpiCard = ({ icon, iconBg, iconColor, label, value, trend, trendDir, onClick, active }) => (
  <div
    className={`card stat-card stat-card-glow${active ? ' card-active' : ''}`}
    onClick={onClick}
    style={{ cursor: 'pointer', borderColor: active ? iconColor : '', borderTopWidth: active ? 3 : 1 }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div className="kpi-icon-box" style={{ background: iconBg }}>
        {React.cloneElement(icon, { size: 20, color: iconColor })}
      </div>
      {trend && (
        <span className={`kpi-trend ${trendDir}`}>
          {trendDir === 'up' ? '▲' : trendDir === 'down' ? '▼' : '●'} {trend}
        </span>
      )}
    </div>
    <div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value"><AnimatedCounter value={value} /></div>
    </div>
    <div style={{ fontSize: '0.72rem', color: iconColor, fontWeight: 600 }}>Click for details →</div>
  </div>
);

const Dashboard = () => {
  const { user, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const isManagerOrAdmin = isAdmin || isManager;

  const [stats, setStats] = useState({ totalEmployees: 0, activeShifts: 0, attendanceRate: '0%', pendingLeaves: 0, myShiftToday: 'Off Duty', myClockInTime: '--:--', myClockOutTime: '--:--', myAttendanceStatus: 'absent' });
  const [recentActivities, setRecentActivities] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);
  const [employeesList, setEmployeesList] = useState([]);
  const [pendingLeavesList, setPendingLeavesList] = useState([]);
  const [allocationsList, setAllocationsList] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (isManagerOrAdmin) {
        const [empRes, leaveRes] = await Promise.all([client.get('/api/employees'), client.get('/api/leaves?status=pending')]);
        const employees = empRes.data, pendingLeaves = leaveRes.data;
        setEmployeesList(employees); setPendingLeavesList(pendingLeaves);

        const todayStr = new Date().toISOString().split('T')[0];
        const [allocRes, attnRes] = await Promise.all([
          client.get(`/api/shifts/allocations?start_date=${todayStr}&end_date=${todayStr}`),
          client.get(`/api/attendance/history?start_date=${todayStr}&end_date=${todayStr}`)
        ]);
        const allocations = allocRes.data, attendance = attnRes.data;
        setAllocationsList(allocations); setAttendanceList(attendance);

        const presentCount = attendance.filter(a => ['present','late','half-day'].includes(a.status)).length;
        const totalActive = employees.filter(e => e.status === 'active').length;
        const rate = totalActive > 0 ? Math.round((presentCount / totalActive) * 100) : 0;

        setStats({ totalEmployees: employees.length, activeShifts: allocations.length, attendanceRate: `${rate}%`, pendingLeaves: pendingLeaves.length });
        setChartData([
          { name: 'Mon', Rate: 85, Coverage: 92 }, { name: 'Tue', Rate: 88, Coverage: 95 },
          { name: 'Wed', Rate: 91, Coverage: 90 }, { name: 'Thu', Rate: rate, Coverage: Math.min(100, allocations.length * 2) },
          { name: 'Fri', Rate: 83, Coverage: 87 }, { name: 'Sat', Rate: 70, Coverage: 75 }
        ]);
        setRecentActivities([
          { text: `${pendingLeaves.length} leave request(s) pending review.`, time: 'Now', color: 'var(--warning-color)' },
          { text: `${presentCount} of ${totalActive} employees clocked in today.`, time: 'Today', color: 'var(--success-color)' },
          { text: `${allocations.length} shifts scheduled for today.`, time: 'Today', color: 'var(--primary-color)' },
        ]);
        addToast('Dashboard Synced', 'Workforce metrics loaded.', 'success');
      } else {
        const statusRes = await client.get('/api/attendance/status');
        const { shift, attendance } = statusRes.data;
        const leaveRes = await client.get('/api/leaves');
        const approvedCount = leaveRes.data.filter(l => l.status === 'approved').length;
        setStats({
          myShiftToday: shift ? shift.shift_name : 'Off Duty',
          myClockInTime: attendance?.clock_in ? new Date(attendance.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
          myClockOutTime: attendance?.clock_out ? new Date(attendance.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
          myAttendanceStatus: attendance?.status || 'absent',
          pendingLeaves: approvedCount,
        });
        setRecentActivities([
          { text: `Your shift today: ${shift ? shift.shift_name : 'Off Duty'}`, time: 'Today', color: 'var(--primary-color)' },
          { text: attendance ? `Clocked in — check attendance terminal.` : 'You have not clocked in yet today.', time: 'Today', color: attendance ? 'var(--success-color)' : 'var(--warning-color)' },
          { text: `${approvedCount} approved leave(s) in your history.`, time: 'Overall', color: 'var(--accent-color)' },
        ]);
        addToast('ShiftFlow', `Welcome, ${user?.name}!`, 'info');
      }
    } catch (err) {
      addToast('Connection Error', 'Could not load dashboard data.', 'error');
    } finally { setLoading(false); }
  };

  const toggle = (key) => setExpandedCard(prev => prev === key ? null : key);

  const statusBadge = (s) => {
    const map = { present: 'badge-success', late: 'badge-warning', 'half-day': 'badge-info' };
    return <span className={`badge ${map[s] || 'badge-danger'}`}>{s || 'absent'}</span>;
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading dashboard…</span>
    </div>
  );

  return (
    <div className="fade-in">
      {/* Welcome */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Welcome back, <span style={{ color: 'var(--primary-color)' }}>{user?.name?.split(' ')[0]}!</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      {isManagerOrAdmin ? (
        <div className="grid-cols-4 stagger-children">
          <KpiCard icon={<Users />} iconBg="rgba(37,99,235,0.1)" iconColor="var(--primary-color)" label="Total Employees" value={stats.totalEmployees} trend="+2%" trendDir="up" onClick={() => toggle('employees')} active={expandedCard === 'employees'} />
          <KpiCard icon={<CalendarDays />} iconBg="rgba(245,158,11,0.1)" iconColor="var(--warning-color)" label="Active Shifts Today" value={stats.activeShifts} trend="Stable" trendDir="neutral" onClick={() => toggle('shifts')} active={expandedCard === 'shifts'} />
          <KpiCard icon={<UserCheck />} iconBg="rgba(34,197,94,0.1)" iconColor="var(--success-color)" label="Attendance Rate" value={stats.attendanceRate} trend="Live" trendDir="up" onClick={() => toggle('attendance')} active={expandedCard === 'attendance'} />
          <KpiCard icon={<Clock />} iconBg="rgba(239,68,68,0.1)" iconColor="var(--danger-color)" label="Pending Leaves" value={stats.pendingLeaves} trend={stats.pendingLeaves > 0 ? 'Action Req.' : 'Clear'} trendDir={stats.pendingLeaves > 0 ? 'down' : 'up'} onClick={() => toggle('leaves')} active={expandedCard === 'leaves'} />
        </div>
      ) : (
        <div className="grid-cols-4 stagger-children">
          <KpiCard icon={<CalendarDays />} iconBg="rgba(37,99,235,0.1)" iconColor="var(--primary-color)" label="Today's Shift" value={stats.myShiftToday} onClick={() => toggle('empShift')} active={expandedCard === 'empShift'} />
          <KpiCard icon={<Clock />} iconBg="rgba(34,197,94,0.1)" iconColor="var(--success-color)" label="Clock In" value={stats.myClockInTime} onClick={() => toggle('empAttendance')} active={expandedCard === 'empAttendance'} />
          <KpiCard icon={<Clock />} iconBg="rgba(245,158,11,0.1)" iconColor="var(--warning-color)" label="Clock Out" value={stats.myClockOutTime} onClick={() => toggle('empAttendance')} active={expandedCard === 'empAttendance'} />
          <KpiCard icon={<FileCheck />} iconBg="rgba(20,184,166,0.1)" iconColor="var(--accent-color)" label="Today's Status" value={stats.myAttendanceStatus} onClick={() => toggle('empAttendance')} active={expandedCard === 'empAttendance'} />
        </div>
      )}

      {/* Expandable detail drawer */}
      {expandedCard && <DetailDrawer card={expandedCard} employeesList={employeesList} pendingLeavesList={pendingLeavesList} allocationsList={allocationsList} attendanceList={attendanceList} stats={stats} navigate={navigate} statusBadge={statusBadge} fetchDashboardData={fetchDashboardData} addToast={addToast} />}

      {/* Charts + Activities */}
      <div className="grid-cols-2">
        {isManagerOrAdmin ? (
          <Card title="Attendance & Coverage Trend">
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCov" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="Rate" stroke="#22c55e" strokeWidth={2} fill="url(#gRate)" name="Attendance %" />
                  <Area type="monotone" dataKey="Coverage" stroke="#2563eb" strokeWidth={2} fill="url(#gCov)" name="Coverage %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : (
          <Card title="Quick Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', paddingTop: '0.5rem' }}>
              <ActionLink icon={<Clock size={16} />} label="Go to Attendance Terminal" sub="Clock in / Clock out / Request correction" onClick={() => navigate('/attendance')} color="var(--primary-color)" />
              <ActionLink icon={<CalendarDays size={16} />} label="View Shift Roster" sub="See your weekly shift schedule" onClick={() => navigate('/shifts')} color="var(--warning-color)" />
              <ActionLink icon={<FileCheck size={16} />} label="Submit Leave Request" sub="Apply for sick, casual, or earned leave" onClick={() => navigate('/leaves')} color="var(--success-color)" />
            </div>
          </Card>
        )}

        <Card
          title="Recent Activity"
          extra={<button style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }} onClick={() => navigate('/notifications')}>View all <ArrowRight size={13} /></button>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {recentActivities.map((act, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', paddingBottom: '0.875rem', borderBottom: i < recentActivities.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: act.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{act.text}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{act.time}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const ActionLink = ({ icon, label, sub, onClick, color }) => (
  <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem', borderRadius: 10, border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s' }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = 'var(--bg-subtle)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = ''; }}>
    <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
    <div>
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '1px' }}>{sub}</div>
    </div>
    <ArrowRight size={15} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
  </div>
);

const DetailDrawer = ({ card, employeesList, pendingLeavesList, allocationsList, attendanceList, stats, navigate, statusBadge, fetchDashboardData, addToast }) => {
  const handleQuickResolve = async (leaveId, action) => {
    try {
      await client.post(`/api/leaves/${leaveId}/resolve`, { action, comments: 'Quick action from dashboard' });
      addToast('Leave Resolved', `Request ${action} successfully.`, 'success');
      fetchDashboardData();
    } catch { addToast('Failed', 'Could not resolve request.', 'error'); }
  };

  const content = () => {
    switch (card) {
      case 'employees': {
        const active = employeesList.filter(e => e.status === 'active').length;
        const inactive = employeesList.filter(e => e.status === 'inactive').length;
        const depts = {};
        employeesList.forEach(e => { const d = e.department_name || 'Unassigned'; depts[d] = (depts[d] || 0) + 1; });
        return (
          <div>
            <DrawerHeader title="Employee Directory" action="View All" onAction={() => navigate('/employees')} />
            <div className="grid-cols-3" style={{ marginBottom: '1rem' }}>
              <MiniStat label="Total" value={employeesList.length} color="var(--primary-color)" />
              <MiniStat label="Active" value={active} color="var(--success-color)" />
              <MiniStat label="Inactive" value={inactive} color="var(--text-muted)" />
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>By Department</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {Object.entries(depts).map(([d, c]) => (
                <span key={d} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 9999, padding: '0.25rem 0.75rem', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                  <strong>{d}</strong>: {c}
                </span>
              ))}
            </div>
          </div>
        );
      }
      case 'shifts':
        return (
          <div>
            <DrawerHeader title="Today's Shift Allocations" action="Scheduler →" onAction={() => navigate('/shifts')} />
            {allocationsList.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No shifts scheduled for today.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {allocationsList.slice(0, 8).map(a => (
                  <div key={a.id} style={{ background: 'var(--bg-subtle)', border: `1px solid var(--border-color)`, borderLeft: `3px solid ${a.shift_color || 'var(--primary-color)'}`, borderRadius: 8, padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{a.employee_name}</div>
                    <div style={{ fontSize: '0.78rem', color: a.shift_color || 'var(--primary-color)', fontWeight: 600, marginTop: 2 }}>{a.shift_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{a.shift_start} – {a.shift_end}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'attendance': {
        const present = attendanceList.filter(a => ['present','late','half-day'].includes(a.status)).length;
        const late = attendanceList.filter(a => a.status === 'late').length;
        const half = attendanceList.filter(a => a.status === 'half-day').length;
        const totalActive = employeesList.filter(e => e.status === 'active').length;
        return (
          <div>
            <DrawerHeader title="Today's Attendance Breakdown" action="Terminal →" onAction={() => navigate('/attendance')} />
            <div className="grid-cols-4" style={{ marginBottom: 0 }}>
              <MiniStat label="Present" value={present - late - half} color="var(--success-color)" />
              <MiniStat label="Late" value={late} color="var(--warning-color)" />
              <MiniStat label="Half-day" value={half} color="var(--primary-color)" />
              <MiniStat label="Absent" value={Math.max(0, totalActive - present)} color="var(--danger-color)" />
            </div>
          </div>
        );
      }
      case 'leaves':
        return (
          <div>
            <DrawerHeader title="Pending Leave Requests" action="All Requests →" onAction={() => navigate('/leaves')} />
            {pendingLeavesList.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No pending leave requests.</p>
            ) : (
              <div className="table-container" style={{ margin: 0 }}>
                <table className="data-table">
                  <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Reason</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {pendingLeavesList.map(l => (
                      <tr key={l.id}>
                        <td><strong>{l.employee_name}</strong><br /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.employee_id}</span></td>
                        <td style={{ textTransform: 'capitalize' }}>{l.leave_type}</td>
                        <td style={{ fontSize: '0.82rem' }}>{l.start_date} → {l.end_date}</td>
                        <td style={{ fontSize: '0.82rem', maxWidth: 180 }}>{l.reason}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-success btn-sm" onClick={() => handleQuickResolve(l.id, 'approved')}>Approve</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleQuickResolve(l.id, 'rejected')}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'empShift':
        return (
          <div>
            <DrawerHeader title="Today's Shift Details" action="View Roster →" onAction={() => navigate('/shifts')} />
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stats.myShiftToday === 'Off Duty'
                ? <p style={{ color: 'var(--text-muted)' }}>You are off duty today. Enjoy your rest!</p>
                : <><p><strong>Shift:</strong> {stats.myShiftToday}</p><p><strong>Note:</strong> Report any issues to your department lead before handover.</p></>
              }
            </div>
          </div>
        );
      case 'empAttendance':
        return (
          <div>
            <DrawerHeader title="Today's Attendance Summary" action="Attendance Terminal →" onAction={() => navigate('/attendance')} />
            <div className="grid-cols-3" style={{ marginBottom: 0 }}>
              <MiniStat label="Status" value={stats.myAttendanceStatus} color="var(--primary-color)" />
              <MiniStat label="Clock In" value={stats.myClockInTime} color="var(--success-color)" />
              <MiniStat label="Clock Out" value={stats.myClockOutTime} color="var(--warning-color)" />
            </div>
          </div>
        );
      default: return null;
    }
  };

  return <div className="card-detail-drawer">{content()}</div>;
};

const DrawerHeader = ({ title, action, onAction }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
    <button className="btn btn-outline btn-sm" onClick={onAction}>{action}</button>
  </div>
);

const MiniStat = ({ label, value, color }) => (
  <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderTop: `3px solid ${color}`, borderRadius: 8, padding: '0.875rem', textAlign: 'center' }}>
    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
    <div style={{ fontSize: '1.35rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
  </div>
);

export default Dashboard;
