import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import Card from '../components/Card';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';
import { PlusCircle, Search, ArrowUpDown } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Leaves = () => {
  const { isAdmin, isManager } = useAuth();
  const isManagerOrAdmin = isAdmin || isManager;
  const { addToast } = useToast();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const [submitForm, setSubmitForm] = useState({
    leave_type: 'sick',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const [resolveForm, setResolveForm] = useState({ action: 'approved', comments: '' });

  // Client-side search, sort, filter, pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('start_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => { fetchLeaves(); }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await client.get('/api/leaves');
      setLeaves(res.data);
    } catch { console.error('Failed to fetch leaves'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setActionLoading(true);
    try {
      await client.post('/api/leaves', submitForm);
      addToast('Leave Submitted', 'Your request has been sent for review.', 'success');
      setIsSubmitOpen(false); fetchLeaves();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit request';
      setError(msg); addToast('Submission Failed', msg, 'error');
    } finally { setActionLoading(false); }
  };

  const handleResolve = async (e) => {
    e.preventDefault(); setError(''); setActionLoading(true);
    try {
      await client.post(`/api/leaves/${selectedLeave.id}/resolve`, resolveForm);
      addToast('Decision Saved', `Leave request ${resolveForm.action}.`, resolveForm.action === 'approved' ? 'success' : 'error');
      setIsResolveOpen(false); fetchLeaves();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resolve';
      setError(msg); addToast('Failed', msg, 'error');
    } finally { setActionLoading(false); }
  };

  const openResolve = (leave) => {
    setError(''); setSelectedLeave(leave);
    setResolveForm({ action: 'approved', comments: '' });
    setIsResolveOpen(true);
  };

  const statusBadge = (s) => {
    const map = { approved: 'badge-success', rejected: 'badge-danger', pending: 'badge-warning' };
    return <span className={`badge ${map[s] || 'badge-muted'}`}>{s}</span>;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const renderSortableHeader = (label, field) => {
    const isSorted = sortField === field;
    return (
      <span onClick={() => handleSort(field)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', select: 'none' }}>
        {label}
        <ArrowUpDown size={12} style={{ opacity: isSorted ? 1 : 0.35, color: isSorted ? 'var(--primary-color)' : 'inherit' }} />
      </span>
    );
  };

  // Filter leaves
  const searchedLeaves = leaves.filter(l => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      String(l.employee_name || '').toLowerCase().includes(searchLower) ||
      String(l.employee_id || '').toLowerCase().includes(searchLower) ||
      String(l.reason || '').toLowerCase().includes(searchLower) ||
      String(l.leave_type || '').toLowerCase().includes(searchLower);
    
    const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Sort leaves
  const sortedLeaves = [...searchedLeaves].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    
    if (sortField === 'name') {
      valA = (a.employee_name || '').toLowerCase();
      valB = (b.employee_name || '').toLowerCase();
    } else if (sortField === 'id') {
      valA = (a.employee_id || '').toLowerCase();
      valB = (b.employee_id || '').toLowerCase();
    } else if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }
    
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination leaves
  const totalEntries = sortedLeaves.length;
  const totalPages = Math.ceil(totalEntries / pageSize);
  const paginatedLeaves = sortedLeaves.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const renderSkeletons = () => {
    return Array.from({ length: pageSize }).map((_, idx) => (
      <tr key={idx} className="skeleton-row">
        {isManagerOrAdmin ? (
          <>
            <td><span className="skeleton-text" style={{ width: '130px' }} /></td>
            <td><span className="skeleton-text" style={{ width: '80px' }} /></td>
            <td><span className="skeleton-text" style={{ width: '80px' }} /></td>
            <td><span className="skeleton-text" style={{ width: '80px' }} /></td>
            <td><span className="skeleton-text" style={{ width: '120px' }} /></td>
            <td><span className="skeleton-text" style={{ width: '70px' }} /></td>
            <td><span className="skeleton-text" style={{ width: '100px' }} /></td>
            <td><span className="skeleton-text" style={{ width: '60px' }} /></td>
          </>
        ) : (
          <>
            <td><span className="skeleton-text" style={{ width: '80px' }} /></td>
            <td><span className="skeleton-text" style={{ width: '80px' }} /></td>
            <td><span className="skeleton-text" style={{ width: '80px' }} /></td>
            <td><span className="skeleton-text" style={{ width: '120px' }} /></td>
            <td><span className="skeleton-text" style={{ width: '70px' }} /></td>
            <td><span className="skeleton-text" style={{ width: '100px' }} /></td>
            <td><span className="skeleton-text" style={{ width: '130px' }} /></td>
          </>
        )}
      </tr>
    ));
  };

  const headers = isManagerOrAdmin
    ? [
        renderSortableHeader('Employee', 'name'),
        renderSortableHeader('Type', 'leave_type'),
        renderSortableHeader('From', 'start_date'),
        renderSortableHeader('To', 'end_date'),
        'Reason',
        renderSortableHeader('Status', 'status'),
        'Comments',
        'Action'
      ]
    : [
        renderSortableHeader('Type', 'leave_type'),
        renderSortableHeader('From', 'start_date'),
        renderSortableHeader('To', 'end_date'),
        'Reason',
        renderSortableHeader('Status', 'status'),
        'Comments',
        'Approved By'
      ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h2>Leave Request Center</h2>
          <p>Manage vacation, medical, and casual leave requests.</p>
        </div>
        <div className="page-header-actions">
          {!isManagerOrAdmin && (
            <Button variant="primary" onClick={() => { setError(''); setIsSubmitOpen(true); }}>
              <PlusCircle size={15} /> Request Leave
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => { setFilterStatus(s); setCurrentPage(1); }} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-outline'}`} style={{ textTransform: 'capitalize' }}>
            {s} {s !== 'all' && <span style={{ marginLeft: 4, opacity: 0.7 }}>({leaves.filter(l => l.status === s).length})</span>}
          </button>
        ))}
      </div>

      <Card>
        {/* Table Toolbar */}
        <div className="table-toolbar">
          <div className="topbar-search-container" style={{ width: '100%', maxWidth: '300px' }}>
            <Search size={16} className="topbar-search-icon" />
            <input 
              type="text" 
              placeholder="Search by name, ID, or reason..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="topbar-search-input"
              style={{ width: '100%' }}
            />
          </div>
          <div className="table-filters">
            <select 
              value={pageSize} 
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} 
              className="table-select-filter"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
            </select>
          </div>
        </div>

        <Table headers={headers} isEmpty={!loading && paginatedLeaves.length === 0}>
          {loading ? (
            renderSkeletons()
          ) : (
            paginatedLeaves.map(leave => (
              <tr key={leave.id}>
                {isManagerOrAdmin && (
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{leave.employee_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{leave.employee_id}</div>
                  </td>
                )}
                <td style={{ textTransform: 'capitalize' }}>{leave.leave_type}</td>
                <td style={{ fontSize: '0.85rem' }}>{leave.start_date}</td>
                <td style={{ fontSize: '0.85rem' }}>{leave.end_date}</td>
                <td style={{ fontSize: '0.82rem', maxWidth: 160, color: 'var(--text-secondary)' }}><em>"{leave.reason}"</em></td>
                <td>{statusBadge(leave.status)}</td>
                <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{leave.comments || '—'}</td>
                {isManagerOrAdmin ? (
                  <td>
                    {leave.status === 'pending'
                      ? <Button variant="outline" size="sm" onClick={() => openResolve(leave)}>Review</Button>
                      : <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Resolved</span>}
                  </td>
                ) : (
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{leave.approved_by || '—'}</td>
                )}
              </tr>
            ))
          )}
        </Table>

        {/* Pagination Block */}
        {!loading && totalPages > 1 && (
          <div className="pagination-container">
            <span className="pagination-info">
              Showing {Math.min(totalEntries, (currentPage - 1) * pageSize + 1)} to {Math.min(totalEntries, currentPage * pageSize)} of {totalEntries} entries
            </span>
            <div className="pagination-buttons">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`pagination-btn ${currentPage === idx + 1 ? 'pagination-btn-active' : ''}`}
                >
                  {idx + 1}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Submit Modal */}
      <Modal isOpen={isSubmitOpen} onClose={() => setIsSubmitOpen(false)} title="Submit Leave Request">
        <form onSubmit={handleSubmit}>
          {error && <div className="alert-error">{error}</div>}
          <Input label="Leave Type" id="leave_type" name="leave_type" type="select" value={submitForm.leave_type}
            onChange={e => setSubmitForm({ ...submitForm, leave_type: e.target.value })}
            options={[{ value: 'sick', label: 'Sick Leave' }, { value: 'casual', label: 'Casual Leave' }, { value: 'earned', label: 'Earned Leave' }, { value: 'unpaid', label: 'Unpaid Leave' }]} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <Input label="Start Date" id="start_date" type="date" value={submitForm.start_date} onChange={e => setSubmitForm({ ...submitForm, start_date: e.target.value })} required />
            <Input label="End Date" id="end_date" type="date" value={submitForm.end_date} onChange={e => setSubmitForm({ ...submitForm, end_date: e.target.value })} required />
          </div>
          <Input label="Reason" id="reason" type="textarea" placeholder="Provide a brief explanation..." value={submitForm.reason} onChange={e => setSubmitForm({ ...submitForm, reason: e.target.value })} required />
          <div className="modal-footer">
            <Button variant="outline" onClick={() => setIsSubmitOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={actionLoading}>Submit Request</Button>
          </div>
        </form>
      </Modal>

      {/* Resolve Modal */}
      <Modal isOpen={isResolveOpen} onClose={() => setIsResolveOpen(false)} title="Review Leave Request">
        {selectedLeave && (
          <form onSubmit={handleResolve}>
            {error && <div className="alert-error">{error}</div>}
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '1rem', marginBottom: '1.25rem', fontSize: '0.875rem', lineHeight: 1.7 }}>
              <div><strong>Employee:</strong> {selectedLeave.employee_name} ({selectedLeave.employee_id})</div>
              <div><strong>Type:</strong> <span style={{ textTransform: 'capitalize' }}>{selectedLeave.leave_type}</span></div>
              <div><strong>Dates:</strong> {selectedLeave.start_date} → {selectedLeave.end_date}</div>
              <div><strong>Reason:</strong> <em>{selectedLeave.reason}</em></div>
            </div>
            <Input label="Decision" id="action" type="select" value={resolveForm.action}
              onChange={e => setResolveForm({ ...resolveForm, action: e.target.value })}
              options={[{ value: 'approved', label: '✅ Approve Request' }, { value: 'rejected', label: '❌ Reject Request' }]} required />
            <Input label="Comments (optional)" id="comments" type="textarea" placeholder="Add admin remarks..." value={resolveForm.comments}
              onChange={e => setResolveForm({ ...resolveForm, comments: e.target.value })} />
            <div className="modal-footer">
              <Button variant="outline" onClick={() => setIsResolveOpen(false)}>Cancel</Button>
              <Button type="submit" variant={resolveForm.action === 'approved' ? 'success' : 'danger'} loading={actionLoading}>Save Decision</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Leaves;
