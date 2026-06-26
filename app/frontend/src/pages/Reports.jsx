import React, { useState, useEffect } from 'react';
import client from '../api/client';
import Card from '../components/Card';
import Table from '../components/Table';
import Input from '../components/Input';
import Button from '../components/Button';
import { FileText, Download, FileSpreadsheet, PlusCircle } from 'lucide-react';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [reportForm, setReportForm] = useState({
    type: 'shift',
    format: 'pdf',
    start_date: '',
    end_date: ''
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Default dates (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = today.toISOString().split('T')[0];

    setReportForm({
      type: 'shift',
      format: 'pdf',
      start_date: firstDay,
      end_date: lastDay
    });

    fetchReportHistory();
  }, []);

  const fetchReportHistory = async () => {
    setLoading(true);
    try {
      const res = await client.get('/api/reports');
      setReports(res.data);
    } catch (err) {
      console.error('Error fetching report details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setError('');
    setActionLoading(true);
    try {
      await client.post('/api/reports/generate', reportForm);
      fetchReportHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to compile report');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async (reportId, filename) => {
    try {
      const response = await client.get(`/api/reports/download/${reportId}`, {
        responseType: 'blob' // Important to fetch binary stream
      });
      
      // Create download link and trigger click
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to download report file');
    }
  };

  const getFormatIcon = (filename) => {
    if (filename.endsWith('.xlsx')) {
      return <FileSpreadsheet size={18} color="var(--success-color)" />;
    }
    return <FileText size={18} color="var(--danger-color)" />;
  };

  if (loading && reports.length === 0) {
    return <div style={loaderStyle}>Loading reports history...</div>;
  }

  return (
    <div className="fade-in">
      <div style={headerStyle}>
        <div>
          <h2>Workforce Reports & Analytics</h2>
          <p>Compile custom shift allocations, attendance metrics, and export spreadsheet/print PDFs.</p>
        </div>
      </div>

      <div style={reportsLayoutGridStyle}>
        {/* REPORT GENERATION COMPILER CARD */}
        <Card title="Compile Custom Report">
          <form onSubmit={handleGenerateReport}>
            {error && <div style={errorStyle}>{error}</div>}

            <Input
              label="Select Report Subject"
              id="type"
              name="type"
              type="select"
              value={reportForm.type}
              onChange={(e) => setReportForm({ ...reportForm, type: e.target.value })}
              options={[
                { value: 'shift', label: 'Shift Roster Allocations' },
                { value: 'attendance', label: 'Attendance logs & statuses' }
              ]}
              required
            />

            <Input
              label="Export Format"
              id="format"
              name="format"
              type="select"
              value={reportForm.format}
              onChange={(e) => setReportForm({ ...reportForm, format: e.target.value })}
              options={[
                { value: 'pdf', label: 'A4 Document Format (PDF)' },
                { value: 'excel', label: 'Data Spreadsheet (Excel)' }
              ]}
              required
            />

            <div style={formRowStyle}>
              <Input
                label="From Date"
                id="start_date"
                type="date"
                value={reportForm.start_date}
                onChange={(e) => setReportForm({ ...reportForm, start_date: e.target.value })}
                required
              />
              <Input
                label="To Date"
                id="end_date"
                type="date"
                value={reportForm.end_date}
                onChange={(e) => setReportForm({ ...reportForm, end_date: e.target.value })}
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={actionLoading}
              style={{ width: '100%', marginTop: '1rem', padding: '0.85rem' }}
            >
              <PlusCircle size={18} /> Compile & Export
            </Button>
          </form>
        </Card>

        {/* REPORT HISTORICAL COMPILED LIST CARD */}
        <Card title="Compiled Reports Archive">
          <Table headers={['Type', 'Filename', 'Generated On', 'Action']}>
            {reports.map((report) => (
              <tr key={report.id}>
                <td style={{ textTransform: 'capitalize' }}><strong>{report.type}</strong></td>
                <td>
                  <div style={filenameStyle}>
                    {getFormatIcon(report.name)}
                    <span>{report.name}</span>
                  </div>
                </td>
                <td>{new Date(report.created_at).toLocaleString()}</td>
                <td>
                  <button onClick={() => handleDownload(report.id, report.name)} style={actionBtnStyle}>
                    <Download size={18} color="var(--primary-color)" />
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
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
  marginBottom: '2rem',
};

const reportsLayoutGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1.5fr',
  gap: '2rem',
};

const formRowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
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

const filenameStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.9rem',
};

const actionBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0.25rem',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
};

export default Reports;
