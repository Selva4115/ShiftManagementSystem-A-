import React, { useState, useEffect } from 'react';
import client from '../api/client';
import Card from '../components/Card';
import Table from '../components/Table';
import Input from '../components/Input';
import Button from '../components/Button';
import { FileText, Download, FileSpreadsheet, PlusCircle, BarChart2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

  const [reportForm, setReportForm] = useState({
    type: 'shift', format: 'pdf',
    start_date: firstDay,
    end_date: today.toISOString().split('T')[0]
  });

  useEffect(() => { fetchReportHistory(); }, []);

  const fetchReportHistory = async () => {
    setLoading(true);
    try {
      const res = await client.get('/api/reports');
      setReports(res.data);
    } catch { console.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(''); setActionLoading(true);
    try {
      await client.post('/api/reports/generate', reportForm);
      addToast('Report Generated', 'Your report has been compiled and saved.', 'success');
      fetchReportHistory();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to compile report';
      setError(msg);
      addToast('Report Failed', msg, 'error');
    } finally { setActionLoading(false); }
  };

  const handleDownload = async (id, filename) => {
    try {
      const res = await client.get(`/api/reports/download/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.setAttribute('download', filename);
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      addToast('Download Started', filename, 'info');
    } catch { addToast('Download Failed', 'Could not download report file.', 'error'); }
  };

  const getFormatIcon = (name) => name?.endsWith('.xlsx')
    ? <FileSpreadsheet size={16} color="var(--success-color)" />
    : <FileText size={16} color="var(--danger-color)" />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h2>Reports & Analytics</h2>
          <p>Compile shift rosters, attendance metrics and export PDF or Excel.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.5rem' }}>
        {/* Generator */}
        <Card title="Compile New Report">
          <form onSubmit={handleGenerate}>
            {error && <div className="alert-error">{error}</div>}
            <Input label="Report Type" id="type" name="type" type="select" value={reportForm.type}
              onChange={e => setReportForm({ ...reportForm, type: e.target.value })}
              options={[{ value: 'shift', label: 'Shift Roster Allocations' }, { value: 'attendance', label: 'Attendance Logs & Statuses' }]} required />
            <Input label="Export Format" id="format" name="format" type="select" value={reportForm.format}
              onChange={e => setReportForm({ ...reportForm, format: e.target.value })}
              options={[{ value: 'pdf', label: 'PDF Document' }, { value: 'excel', label: 'Excel Spreadsheet' }]} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <Input label="From Date" id="start_date" type="date" value={reportForm.start_date}
                onChange={e => setReportForm({ ...reportForm, start_date: e.target.value })} required />
              <Input label="To Date" id="end_date" type="date" value={reportForm.end_date}
                onChange={e => setReportForm({ ...reportForm, end_date: e.target.value })} required />
            </div>
            <Button type="submit" variant="primary" loading={actionLoading} style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}>
              <PlusCircle size={16} /> Generate Report
            </Button>
          </form>
        </Card>

        {/* Archive */}
        <Card title="Reports Archive" extra={<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{reports.length} reports</span>}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 44, borderRadius: 8, background: 'var(--bg-subtle)', animation: 'skeletonPulse 1.6s infinite' }} />)}
            </div>
          ) : (
            <Table
              headers={['Type', 'File', 'Generated', 'Download']}
              isEmpty={reports.length === 0}
              emptyMessage="No reports generated yet."
            >
              {reports.map(r => (
                <tr key={r.id}>
                  <td>
                    <span className={`badge ${r.type === 'shift' ? 'badge-info' : 'badge-accent'}`} style={{ textTransform: 'capitalize' }}>{r.type}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getFormatIcon(r.name)}
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{r.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleString()}</td>
                  <td>
                    <button onClick={() => handleDownload(r.id, r.name)} className="btn btn-ghost btn-icon" title="Download">
                      <Download size={16} color="var(--primary-color)" />
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Reports;
