import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import Card from '../components/Card';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';
import { Play, Square, History, ClipboardCheck, CheckCircle2, XCircle } from 'lucide-react';

const Attendance = () => {
  const { user, isAdmin, isManager } = useAuth();
  const isManagerOrAdmin = isAdmin || isManager;

  // Status indicators
  const [todayShift, setTodayShift] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [history, setHistory] = useState([]);
  const [pendingCorrections, setPendingCorrections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [employeesList, setEmployeesList] = useState([]);

  // Modals
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Correction Form
  const [correctionForm, setCorrectionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    clock_in: '',
    clock_out: '',
    reason: ''
  });

  useEffect(() => {
    // Default filter dates (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = today.toISOString().split('T')[0];
    setFilterStart(firstDay);
    setFilterEnd(lastDay);

    fetchAttendanceStatus();
    if (isManagerOrAdmin) {
      fetchAdminDependencies();
    }
  }, []);

  useEffect(() => {
    if (filterStart && filterEnd) {
      fetchAttendanceHistory();
    }
  }, [filterStart, filterEnd, filterEmployee]);

  const fetchAttendanceStatus = async () => {
    setLoading(true);
    try {
      if (!isManagerOrAdmin) {
        const res = await client.get('/api/attendance/status');
        setTodayShift(res.data.shift);
        setTodayAttendance(res.data.attendance);
      }
    } catch (err) {
      console.error('Error fetching today status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminDependencies = async () => {
    try {
      const [empRes, corrRes] = await Promise.all([
        client.get('/api/employees'),
        client.get('/api/attendance/corrections/pending')
      ]);
      setEmployeesList(empRes.data);
      setPendingCorrections(corrRes.data);
    } catch (err) {
      console.error('Error loading admin tables:', err);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const res = await client.get(
        `/api/attendance/history?start_date=${filterStart}&end_date=${filterEnd}&employee_id=${filterEmployee}`
      );
      setHistory(res.data);
    } catch (err) {
      console.error('Error fetching history logs:', err);
    }
  };

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      const res = await client.post('/api/attendance/clock-in');
      setTodayAttendance(res.data);
      fetchAttendanceHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Clock In failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      const res = await client.post('/api/attendance/clock-out');
      setTodayAttendance(res.data);
      fetchAttendanceHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Clock Out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openCorrectionModal = () => {
    setError('');
    const todayStr = new Date().toISOString().split('T')[0];
    setCorrectionForm({
      date: todayStr,
      clock_in: `${todayStr}T09:00:00`,
      clock_out: `${todayStr}T17:00:00`,
      reason: ''
    });
    setIsCorrectionModalOpen(true);
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setActionLoading(true);
    try {
      await client.post('/api/attendance/correction', correctionForm);
      setIsCorrectionModalOpen(false);
      alert('Correction request submitted to Administrator.');
      fetchAttendanceHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit adjustment request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveCorrection = async (recordId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;
    try {
      await client.post(`/api/attendance/corrections/${recordId}/resolve`, { action });
      fetchAdminDependencies();
      fetchAttendanceHistory();
    } catch (err) {
      alert('Failed to resolve correction');
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

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fade-in">
      <div style={headerStyle}>
        <div>
          <h2>Attendance Terminal</h2>
          <p>Track real-time check-ins and submit adjustment corrections.</p>
        </div>
        {!isManagerOrAdmin && (
          <Button variant="outline" onClick={openCorrectionModal}>
            <History size={16} /> Request Correction
          </Button>
        )}
      </div>

      {/* CLOCK IN/OUT TERMINAL FOR EMPLOYEES */}
      {!isManagerOrAdmin && (
        <div style={terminalGridStyle}>
          <Card title="Today's Shift Assignment">
            {todayShift ? (
              <div style={shiftBoxStyle}>
                <h3 style={{ color: todayShift.shift_color }}>{todayShift.shift_name} Shift</h3>
                <p style={timeSpanStyle}>Hours: {todayShift.start_time} - {todayShift.end_time}</p>
                <div style={shiftStatusIndicatorStyle}>
                  <div style={{ ...dotStyle, backgroundColor: todayShift.shift_color }}></div>
                  <span>Scheduled Duty</span>
                </div>
              </div>
            ) : (
              <div style={shiftBoxStyle}>
                <h3 style={{ color: 'var(--text-secondary)' }}>Off Duty</h3>
                <p style={timeSpanStyle}>No shift allocated for today.</p>
              </div>
            )}
          </Card>

          <Card title="Clock Actions">
            <div style={clockActionsContainerStyle}>
              {todayAttendance?.clock_in ? (
                <div style={statusLabelStyle}>
                  Clocked In: <strong style={{ color: 'var(--success-color)' }}>{formatTime(todayAttendance.clock_in)}</strong>
                </div>
              ) : (
                <div style={statusLabelStyle}>Status: <strong>Not Checked In</strong></div>
              )}

              {todayAttendance?.clock_out ? (
                <div style={statusLabelStyle}>
                  Clocked Out: <strong style={{ color: 'var(--danger-color)' }}>{formatTime(todayAttendance.clock_out)}</strong>
                </div>
              ) : null}

              <div style={btnGroupStyle}>
                <Button 
                  variant="primary" 
                  onClick={handleClockIn} 
                  disabled={todayAttendance?.clock_in || actionLoading}
                  style={clockBtnStyle}
                >
                  <Play size={18} /> Clock In
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleClockOut} 
                  disabled={!todayAttendance?.clock_in || todayAttendance?.clock_out || actionLoading}
                  style={clockBtnStyle}
                >
                  <Square size={18} /> Clock Out
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ADMIN CORRECTION REQUEST RECONCILIATION QUEUE */}
      {isManagerOrAdmin && pendingCorrections.length > 0 && (
        <Card title="Pending Attendance Correction Requests" style={{ marginBottom: '2rem' }}>
          <Table headers={['Employee', 'Date', 'Original Times', 'Requested Times', 'Reason', 'Actions']}>
            {pendingCorrections.map((corr) => (
              <tr key={corr.id}>
                <td><strong>{corr.employee_name}</strong><br/><span style={empSubStyle}>{corr.employee_id}</span></td>
                <td>{corr.date}</td>
                <td>
                  In: {formatTime(corr.clock_in)}<br/>
                  Out: {formatTime(corr.clock_out)}
                </td>
                <td>
                  In: <span style={corrHighlightStyle}>{formatTime(corr.correction_clock_in)}</span><br/>
                  Out: <span style={corrHighlightStyle}>{formatTime(corr.correction_clock_out)}</span>
                </td>
                <td style={{ maxWidth: '200px' }}><em>"{corr.correction_reason}"</em></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleResolveCorrection(corr.id, 'approve')} style={actionBtnStyle}>
                      <CheckCircle2 size={20} color="var(--success-color)" />
                    </button>
                    <button onClick={() => handleResolveCorrection(corr.id, 'reject')} style={actionBtnStyle}>
                      <XCircle size={20} color="var(--danger-color)" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {/* HISTORICAL ATTENDANCE REPORTING */}
      <Card title="Attendance Logs">
        <div style={filterHeaderStyle}>
          <div style={filterGroupStyle}>
            <div style={{ width: '160px' }}>
              <label style={labelStyle}>Start Date</label>
              <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} className="form-control" />
            </div>
            <div style={{ width: '160px' }}>
              <label style={labelStyle}>End Date</label>
              <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} className="form-control" />
            </div>
            {isManagerOrAdmin && (
              <div style={{ width: '220px' }}>
                <label style={labelStyle}>Employee</label>
                <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} className="form-control">
                  <option value="all">All Employees</option>
                  {employeesList.map(e => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <Table headers={['Date', 'Employee ID', 'Name', 'Clock In', 'Clock Out', 'Status']}>
          {history.map((record) => (
            <tr key={record.id}>
              <td>{record.date}</td>
              <td><strong>{record.employee_id}</strong></td>
              <td>{record.employee_name}</td>
              <td>{formatTime(record.clock_in)}</td>
              <td>{formatTime(record.clock_out)}</td>
              <td>{getStatusBadge(record.status)}</td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* CORRECTION ADJUSTMENT REQUEST MODAL */}
      <Modal isOpen={isCorrectionModalOpen} onClose={() => setIsCorrectionModalOpen(false)} title="Submit Attendance Correction">
        <form onSubmit={handleCorrectionSubmit}>
          {error && <div style={errorStyle}>{error}</div>}

          <Input
            label="Target Date"
            id="date"
            name="date"
            type="date"
            value={correctionForm.date}
            onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
            required
          />

          <Input
            label="Correction Clock In (ISO Date-Time Format)"
            id="clock_in"
            name="clock_in"
            type="datetime-local"
            value={correctionForm.clock_in}
            onChange={(e) => setCorrectionForm({ ...correctionForm, clock_in: e.target.value })}
            required
          />

          <Input
            label="Correction Clock Out (ISO Date-Time Format)"
            id="clock_out"
            name="clock_out"
            type="datetime-local"
            value={correctionForm.clock_out}
            onChange={(e) => setCorrectionForm({ ...correctionForm, clock_out: e.target.value })}
            required
          />

          <Input
            label="Detailed Reason for Correction"
            id="reason"
            name="reason"
            type="textarea"
            placeholder="e.g. Forgot to clock out before leaving..."
            value={correctionForm.reason}
            onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
            required
          />

          <div style={modalFooterStyle}>
            <Button variant="outline" onClick={() => setIsCorrectionModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={actionLoading}>Submit Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '2rem',
};

const terminalGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1.5rem',
  marginBottom: '2rem',
};

const shiftBoxStyle = {
  padding: '1rem 0',
};

const timeSpanStyle = {
  fontSize: '0.95rem',
  color: 'var(--text-secondary)',
  marginTop: '0.25rem',
};

const shiftStatusIndicatorStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.85rem',
  color: 'var(--text-muted)',
  marginTop: '1rem',
};

const dotStyle = {
  width: '10px',
  height: '10px',
  borderRadius: '50%',
};

const clockActionsContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '1rem 0',
};

const statusLabelStyle = {
  fontSize: '1rem',
  marginBottom: '0.75rem',
};

const btnGroupStyle = {
  display: 'flex',
  gap: '1rem',
  width: '100%',
  marginTop: '0.5rem',
};

const clockBtnStyle = {
  flexGrow: 1,
  padding: '0.85rem',
};

const filterHeaderStyle = {
  marginBottom: '1.5rem',
  paddingBottom: '1rem',
  borderBottom: '1px solid var(--border-color)',
};

const filterGroupStyle = {
  display: 'flex',
  gap: '1.25rem',
  alignItems: 'flex-end',
  flexWrap: 'wrap',
};

const labelStyle = {
  fontSize: '0.8rem',
  fontWeight: '600',
  color: 'var(--text-secondary)',
  marginBottom: '0.35rem',
  display: 'block',
};

const actionBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0.25rem',
  borderRadius: '4px',
};

const empSubStyle = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
};

const corrHighlightStyle = {
  color: 'var(--primary-color)',
  fontWeight: '600',
};

const modalFooterStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  marginTop: '1.5rem',
};

const errorStyle = {
  backgroundColor: 'var(--danger-light)',
  color: 'var(--danger-dark)',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  marginBottom: '1rem',
  fontSize: '0.875rem',
  fontWeight: '500',
};

export default Attendance;
