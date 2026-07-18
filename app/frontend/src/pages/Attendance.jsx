import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import Card from '../components/Card';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';
import { Play, Square, History, CheckCircle2, XCircle, Search, ArrowUpDown, Clock } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Attendance = () => {
  const { user, isAdmin, isManager } = useAuth();
  const isManagerOrAdmin = isAdmin || isManager;
  const { addToast } = useToast();

  const [todayShift, setTodayShift] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [history, setHistory] = useState([]);
  const [pendingCorrections, setPendingCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [error, setError] = useState('');

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [filterStart, setFilterStart] = useState(firstDay);
  const [filterEnd, setFilterEnd] = useState(todayStr);
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [employeesList, setEmployeesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [correctionForm, setCorrectionForm] = useState({
    date: todayStr, clock_in: `${todayStr}T09:00`, clock_out: `${todayStr}T17:00`, reason: ''
  });

  useEffect(() => {
    fetchStatus();
    if (isManagerOrAdmin) fetchAdminData();
  }, []);

  useEffect(() => {
    if (filterStart && filterEnd) fetchHistory();
  }, [filterStart, filterEnd, filterEmployee]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      if (!isManagerOrAdmin) {
        const res = await client.get('/api/attendance/status');
        setTodayShift(res.data.shift);
        setTodayAttendance(res.data.attendance);
      }
    } catch { console.error('Status fetch failed'); }
    finally { setLoading(false); }
  };

  const fetchAdminData = async () => {
    try {
      const [empRes, corrRes] = await Promise.all([client.get('/api/employees'), client.get('/api/attendance/corrections/pending')]);
      setEmployeesList(empRes.data);
      setPendingCorrections(corrRes.data);
    } catch { console.error('Admin data fetch failed'); }
  };

  const fetchHistory = async () => {
    try {
      const res = await client.get(`/api/attendance/history?start_date=${filterStart}&end_date=${filterEnd}&employee_id=${filterEmployee}`);
      setHistory(res.data);
    } catch { console.error('History fetch failed'); }
  };

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      const res = await client.post('/api/attendance/clock-in');
      setTodayAttendance(res.data);
      addToast('Clocked In', 'Your attendance has been recorded.', 'success');
      fetchHistory();
    } catch (err) {
      addToast('Clock In Failed', err.response?.data?.message || 'Could not clock in.', 'error');
    } finally { setActionLoading(false); }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      const res = await client.post('/api/attendance/clock-out');
      setTodayAttendance(res.data);
      addToast('Clocked Out', 'Clock-out recorded successfully.', 'success');
      fetchHistory();
    } catch (err) {
      addToast('Clock Out Failed', err.response?.data?.message || 'Could not clock out.', 'error');
    } finally { setActionLoading(false); }
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault(); setError(''); setActionLoading(true);
    try {
      await client.post('/api/attendance/correction', correctionForm);
      addToast('Correction Submitted', 'Your request has been sent to admin.', 'success');
      setIsCorrectionOpen(false); fetchHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit correction');
    } finally { setActionLoading(false); }
  };

  const handleResolveCorrection = async (id, action) => {
    if (!window.confirm(`${action} this correction request?`)) return;
    try {
      await client.post(`/api/attendance/corrections/${id}/resolve`, { action });
      addToast('Resolved', `Correction ${action}d.`, 'success');
      fetchAdminData(); fetchHistory();
    } catch { addToast('Failed', 'Could not resolve correction.', 'error'); }
  };

  const fmt = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  const statusBadge = (s) => {
    const map = { present: 'badge-success', late: 'badge-warning', 'half-day': 'badge-info', absent: 'badge-danger' };
    return <span className={`badge ${map[s] || 'badge-muted'}`}>{s || 'absent'}</span>;
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const SortHeader = ({ label, field }) => (
    <span onClick={() => handleSort(field)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', userSelect: 'none' }}>
      {label}
      <ArrowUpDown size={11} style={{ opacity: sortField === field ? 1 : 0.3, color: sortField === field ? 'var(--primary-color)' : 'inherit' }} />
    </span>
  );

  const filtered = history.filter(r => {
    const s = searchTerm.toLowerCase();
    const matchSearch = String(r.employee_id || '').toLowerCase().includes(s) || String(r.employee_name || '').toLowerCase().includes(s) || String(r.date || '').includes(s);
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    let va = sortField === 'name' ? (a.employee_name || '') : (a[sortField] || '');
    let vb = sortField === 'name' ? (b.employee_name || '') : (b[sortField] || '');
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const total = sorted.length;
  const pages = Math.ceil(total / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h2>Attendance Terminal</h2>
          <p>Clock in/out, track history, and manage corrections.</p>
        </div>
        <div className="page-header-actions">
          {!isManagerOrAdmin && (
            <Button variant="outline" onClick={() => { setError(''); setIsCorrectionOpen(true); }}>
              <History size={15} /> Request Correction
            </Button>
          )}
        </div>
      </div>

      {/* Clock in/out for employees */}
      {!isManagerOrAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <Card title="Today's Shift">
            {todayShift ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: todayShift.shift_color }}>{todayShift.shift_name} Shift</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Hours: {todayShift.start_time} — {todayShift.end_time}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: todayShift.shift_color }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Scheduled Duty</span>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No shift scheduled for today.</div>
            )}
          </Card>

          <Card title="Clock Actions">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
              {todayAttendance?.clock_in && (
                <div style={{ fontSize: '0.875rem', color: 'var(--success-color)', fontWeight: 600 }}>
                  ✓ Clocked in at {fmt(todayAttendance.clock_in)}
                </div>
              )}
              {todayAttendance?.clock_out && (
                <div style={{ fontSize: '0.875rem', color: 'var(--danger-color)', fontWeight: 600 }}>
                  ✓ Clocked out at {fmt(todayAttendance.clock_out)}
                </div>
              )}
              {!todayAttendance?.clock_in && <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Not checked in yet today.</div>}
              <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.25rem' }}>
                <Button variant="primary" onClick={handleClockIn} disabled={!!todayAttendance?.clock_in || actionLoading} style={{ flex: 1, padding: '0.75rem' }}>
                  <Play size={16} /> Clock In
                </Button>
                <Button variant="danger" onClick={handleClockOut} disabled={!todayAttendance?.clock_in || !!todayAttendance?.clock_out || actionLoading} style={{ flex: 1, padding: '0.75rem' }}>
                  <Square size={16} /> Clock Out
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Pending corrections (admin) */}
      {isManagerOrAdmin && pendingCorrections.length > 0 && (
        <Card title={`Pending Corrections (${pendingCorrections.length})`} style={{ marginBottom: '1.5rem' }}>
          <Table headers={['Employee', 'Date', 'Current Times', 'Requested Times', 'Reason', 'Actions']}>
            {pendingCorrections.map(c => (
              <tr key={c.id}>
                <td><strong>{c.employee_name}</strong><br /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.employee_id}</span></td>
                <td>{c.date}</td>
                <td style={{ fontSize: '0.82rem' }}>In: {fmt(c.clock_in)}<br />Out: {fmt(c.clock_out)}</td>
                <td style={{ fontSize: '0.82rem' }}>
                  In: <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{fmt(c.correction_clock_in)}</span><br />
                  Out: <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{fmt(c.correction_clock_out)}</span>
                </td>
                <td style={{ fontSize: '0.82rem', maxWidth: 180 }}><em>{c.correction_reason}</em></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-ghost btn-icon" onClick={() => handleResolveCorrection(c.id, 'approve')} title="Approve"><CheckCircle2 size={18} color="var(--success-color)" /></button>
                    <button className="btn btn-ghost btn-icon" onClick={() => handleResolveCorrection(c.id, 'reject')} title="Reject"><XCircle size={18} color="var(--danger-color)" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {/* History */}
      <Card title="Attendance History">
        {/* Date + employee filters */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>From</label>
            <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="form-control" style={{ width: 160 }} />
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>To</label>
            <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="form-control" style={{ width: 160 }} />
          </div>
          {isManagerOrAdmin && (
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Employee</label>
              <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="form-control" style={{ width: 200 }}>
                <option value="all">All Employees</option>
                {employeesList.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Search + status filter */}
        <div className="table-toolbar">
          <div className="topbar-search-container">
            <Search size={15} className="topbar-search-icon" />
            <input type="text" placeholder="Search by name, ID or date..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} className="topbar-search-input" style={{ width: 260 }} />
          </div>
          <div className="table-filters">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="table-select-filter">
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="half-day">Half-day</option>
              <option value="absent">Absent</option>
            </select>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="table-select-filter">
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        <Table
          headers={[<SortHeader label="Date" field="date" />, <SortHeader label="Employee ID" field="id" />, <SortHeader label="Name" field="name" />, <SortHeader label="Clock In" field="clock_in" />, <SortHeader label="Clock Out" field="clock_out" />, <SortHeader label="Status" field="status" />]}
          isEmpty={!loading && paginated.length === 0}
        >
          {loading ? (
            Array.from({ length: pageSize }).map((_, i) => (
              <tr key={i} className="skeleton-row">
                {[80, 90, 130, 80, 80, 70].map((w, j) => <td key={j}><span className="skeleton-text" style={{ width: w }} /></td>)}
              </tr>
            ))
          ) : (
            paginated.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.date}</td>
                <td><span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--primary-color)' }}>{r.employee_id}</span></td>
                <td>{r.employee_name}</td>
                <td style={{ fontSize: '0.85rem' }}>{fmt(r.clock_in)}</td>
                <td style={{ fontSize: '0.85rem' }}>{fmt(r.clock_out)}</td>
                <td>{statusBadge(r.status)}</td>
              </tr>
            ))
          )}
        </Table>

        {!loading && pages > 1 && (
          <div className="pagination-container">
            <span className="pagination-info">Showing {Math.min(total, (page-1)*pageSize+1)}–{Math.min(total, page*pageSize)} of {total}</span>
            <div className="pagination-buttons">
              <button className="pagination-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>← Prev</button>
              {Array.from({ length: pages }).map((_, i) => (
                <button key={i} className={`pagination-btn${page === i+1 ? ' pagination-btn-active' : ''}`} onClick={() => setPage(i+1)}>{i+1}</button>
              ))}
              <button className="pagination-btn" onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}>Next →</button>
            </div>
          </div>
        )}
      </Card>

      {/* Correction Modal */}
      <Modal isOpen={isCorrectionOpen} onClose={() => setIsCorrectionOpen(false)} title="Request Attendance Correction">
        <form onSubmit={handleCorrectionSubmit}>
          {error && <div className="alert-error">{error}</div>}
          <Input label="Target Date" id="date" type="date" value={correctionForm.date} onChange={e => setCorrectionForm({ ...correctionForm, date: e.target.value })} required />
          <Input label="Corrected Clock In" id="clock_in" type="datetime-local" value={correctionForm.clock_in} onChange={e => setCorrectionForm({ ...correctionForm, clock_in: e.target.value })} required />
          <Input label="Corrected Clock Out" id="clock_out" type="datetime-local" value={correctionForm.clock_out} onChange={e => setCorrectionForm({ ...correctionForm, clock_out: e.target.value })} required />
          <Input label="Reason for Correction" id="reason" type="textarea" placeholder="e.g. Forgot to clock out before leaving..." value={correctionForm.reason} onChange={e => setCorrectionForm({ ...correctionForm, reason: e.target.value })} required />
          <div className="modal-footer">
            <Button variant="outline" onClick={() => setIsCorrectionOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={actionLoading}>Submit Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Attendance;
