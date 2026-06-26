import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import Card from '../components/Card';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';
import { PlusCircle, CheckCircle, XCircle } from 'lucide-react';

const Leaves = () => {
  const { user, isAdmin, isManager } = useAuth();
  const isManagerOrAdmin = isAdmin || isManager;

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Submit Request Form
  const [submitForm, setSubmitForm] = useState({
    leave_type: 'sick',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  // Resolve Request Form
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [resolveForm, setResolveForm] = useState({
    action: 'approved', // 'approved' or 'rejected'
    comments: ''
  });

  useEffect(() => {
    fetchLeavesHistory();
  }, []);

  const fetchLeavesHistory = async () => {
    setLoading(true);
    try {
      const res = await client.get('/api/leaves');
      setLeaves(res.data);
    } catch (err) {
      console.error('Error fetching leave details:', err);
    } finally {
      setLoading(false);
    }
  };

  const openSubmitModal = () => {
    setError('');
    setSubmitForm({
      leave_type: 'sick',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      reason: ''
    });
    setIsSubmitModalOpen(true);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setError('');
    setActionLoading(true);
    try {
      await client.post('/api/leaves', submitForm);
      setIsSubmitModalOpen(false);
      fetchLeavesHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setActionLoading(false);
    }
  };

  const openResolveModal = (leave) => {
    setError('');
    setSelectedLeave(leave);
    setResolveForm({
      action: 'approved',
      comments: ''
    });
    setIsResolveModalOpen(true);
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setActionLoading(true);
    try {
      await client.post(`/api/leaves/${selectedLeave.id}/resolve`, resolveForm);
      setIsResolveModalOpen(false);
      fetchLeavesHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resolve leave request');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <span className="badge badge-success">Approved</span>;
      case 'rejected': return <span className="badge badge-danger">Rejected</span>;
      default: return <span className="badge badge-warning">Pending</span>;
    }
  };

  if (loading && leaves.length === 0) {
    return <div style={loaderStyle}>Loading Leave Files...</div>;
  }

  return (
    <div className="fade-in">
      <div style={headerStyle}>
        <div>
          <h2>Leave Request Center</h2>
          <p>Request vacation/medical leaves and review authorization history.</p>
        </div>
        {!isManagerOrAdmin && (
          <Button variant="primary" onClick={openSubmitModal}>
            <PlusCircle size={16} /> Request Leave
          </Button>
        )}
      </div>

      <Card>
        <Table 
          headers={
            isManagerOrAdmin 
              ? ['Emp ID', 'Employee Name', 'Leave Type', 'Start Date', 'End Date', 'Reason', 'Status', 'Comments', 'Actions']
              : ['Leave Type', 'Start Date', 'End Date', 'Reason', 'Status', 'Comments', 'Approver ID']
          }
          isEmpty={leaves.length === 0}
        >
          {leaves.map((leave) => (
            <tr key={leave.id}>
              {isManagerOrAdmin && (
                <>
                  <td><strong>{leave.employee_id}</strong></td>
                  <td>{leave.employee_name}</td>
                </>
              )}
              <td style={{ textTransform: 'capitalize' }}>{leave.leave_type}</td>
              <td>{leave.start_date}</td>
              <td>{leave.end_date}</td>
              <td><em>"{leave.reason}"</em></td>
              <td>{getStatusBadge(leave.status)}</td>
              <td>{leave.comments || '-'}</td>
              
              {isManagerOrAdmin ? (
                <td>
                  {leave.status === 'pending' ? (
                    <Button variant="outline" onClick={() => openResolveModal(leave)} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>
                      Review
                    </Button>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Resolved</span>
                  )}
                </td>
              ) : (
                <td>{leave.approved_by || '-'}</td>
              )}
            </tr>
          ))}
        </Table>
      </Card>

      {/* 1. Request Submittal Modal */}
      <Modal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} title="Submit Leave Request">
        <form onSubmit={handleSubmitRequest}>
          {error && <div style={errorStyle}>{error}</div>}

          <Input
            label="Leave Type"
            id="leave_type"
            name="leave_type"
            type="select"
            value={submitForm.leave_type}
            onChange={(e) => setSubmitForm({ ...submitForm, leave_type: e.target.value })}
            options={[
              { value: 'sick', label: 'Sick Leave' },
              { value: 'casual', label: 'Casual Leave' },
              { value: 'earned', label: 'Earned Leave' },
              { value: 'unpaid', label: 'Unpaid Leave' }
            ]}
            required
          />

          <div style={formRowStyle}>
            <Input
              label="Start Date"
              id="start_date"
              name="start_date"
              type="date"
              value={submitForm.start_date}
              onChange={(e) => setSubmitForm({ ...submitForm, start_date: e.target.value })}
              required
            />
            <Input
              label="End Date"
              id="end_date"
              name="end_date"
              type="date"
              value={submitForm.end_date}
              onChange={(e) => setSubmitForm({ ...submitForm, end_date: e.target.value })}
              required
            />
          </div>

          <Input
            label="Detailed Reason"
            id="reason"
            name="reason"
            type="textarea"
            placeholder="Provide context explaining the request..."
            value={submitForm.reason}
            onChange={(e) => setSubmitForm({ ...submitForm, reason: e.target.value })}
            required
          />

          <div style={modalFooterStyle}>
            <Button variant="outline" onClick={() => setIsSubmitModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={actionLoading}>Submit Request</Button>
          </div>
        </form>
      </Modal>

      {/* 2. Review Resolution Modal */}
      <Modal isOpen={isResolveModalOpen} onClose={() => setIsResolveModalOpen(false)} title="Review Leave Request">
        {selectedLeave && (
          <form onSubmit={handleResolveSubmit}>
            {error && <div style={errorStyle}>{error}</div>}

            <div style={summaryBoxStyle}>
              <p>Employee: <strong>{selectedLeave.employee_name} ({selectedLeave.employee_id})</strong></p>
              <p>Type: <strong style={{ textTransform: 'capitalize' }}>{selectedLeave.leave_type}</strong></p>
              <p>Dates: <strong>{selectedLeave.start_date} to {selectedLeave.end_date}</strong></p>
              <p style={{ marginTop: '0.5rem' }}>Reason: <em>"{selectedLeave.reason}"</em></p>
            </div>

            <Input
              label="Authorization Action"
              id="action"
              name="action"
              type="select"
              value={resolveForm.action}
              onChange={(e) => setResolveForm({ ...resolveForm, action: e.target.value })}
              options={[
                { value: 'approved', label: 'Approve Request' },
                { value: 'rejected', label: 'Reject Request' }
              ]}
              required
            />

            <Input
              label="Admin Comments / Remarks"
              id="comments"
              name="comments"
              type="textarea"
              placeholder="e.g. Leave approved as per quota rules..."
              value={resolveForm.comments}
              onChange={(e) => setResolveForm({ ...resolveForm, comments: e.target.value })}
            />

            <div style={modalFooterStyle}>
              <Button variant="outline" onClick={() => setIsResolveModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={actionLoading}>Save Decision</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

const loaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh',
  fontSize: '1.25rem',
  color: 'var(--text-secondary)',
  fontWeight: '500',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '2rem',
};

const formRowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
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

const summaryBoxStyle = {
  backgroundColor: 'var(--bg-color)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  padding: '1rem',
  marginBottom: '1.25rem',
  fontSize: '0.9rem',
  color: 'var(--text-primary)',
  lineHeight: '1.5',
};

export default Leaves;
