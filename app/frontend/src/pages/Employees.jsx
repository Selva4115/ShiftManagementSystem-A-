import React, { useState, useEffect } from 'react';
import client from '../api/client';
import Card from '../components/Card';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';
import { UserPlus, Edit2, Trash2, FolderPlus, Award, Search, ArrowUpDown } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const [showDeptCard, setShowDeptCard] = useState(false);
  const [showRoleCard, setShowRoleCard] = useState(false);
  const [showEmpCard, setShowEmpCard] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const blankEmp = { id:'', first_name:'', last_name:'', email:'', password:'', phone:'', department_id:null, role_id:null, hire_date: new Date().toISOString().split('T')[0], status:'active' };
  const [empForm, setEmpForm] = useState(blankEmp);
  const [deptForm, setDeptForm] = useState({ name:'', description:'' });
  const [roleForm, setRoleForm] = useState({ name:'', description:'' });

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes, roleRes] = await Promise.all([client.get('/api/employees'), client.get('/api/employees/departments'), client.get('/api/employees/roles')]);
      setEmployees(empRes.data); setDepartments(deptRes.data); setRoles(roleRes.data);
    } catch { console.error('Fetch failed'); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setError('');
    setEmpForm({ ...blankEmp, department_id: departments[0]?.id || null, role_id: roles[0]?.id || null });
    setShowEmpCard(true);
  };

  const openEdit = (emp) => {
    setError('');
    setEmpForm({ id: emp.id, first_name: emp.first_name, last_name: emp.last_name, email: emp.email, password: 'dummy-password', phone: emp.phone || '', department_id: emp.department_id || '', role_id: emp.role_id || '', hire_date: emp.hire_date || '', status: emp.status });
    setShowEmpCard(true);
  };

  const handleEmpSubmit = async (e) => {
    e.preventDefault(); setError(''); setActionLoading(true);
    try {
      if (empForm.id) {
        const data = { ...empForm }; delete data.password;
        await client.put(`/api/employees/${empForm.id}`, data);
        addToast('Profile Updated', `${empForm.first_name} ${empForm.last_name} saved.`, 'success');
      } else {
        await client.post('/api/employees', empForm);
        addToast('Employee Added', `${empForm.first_name} ${empForm.last_name} registered.`, 'success');
      }
      setShowEmpCard(false); fetchAll();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save';
      setError(msg); addToast('Error', msg, 'error');
    } finally { setActionLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete employee ${id}? This action cannot be undone.`)) return;
    try {
      await client.delete(`/api/employees/${id}`);
      addToast('Deleted', `Employee ${id} removed.`, 'success');
      fetchAll();
    } catch { addToast('Delete Failed', 'Could not remove employee.', 'error'); }
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault(); setError(''); setActionLoading(true);
    try {
      await client.post('/api/employees/departments', deptForm);
      addToast('Department Created', deptForm.name, 'success');
      setShowDeptCard(false); setDeptForm({ name:'', description:'' }); fetchAll();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(false); }
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault(); setError(''); setActionLoading(true);
    try {
      await client.post('/api/employees/roles', roleForm);
      addToast('Role Created', roleForm.name, 'success');
      setShowRoleCard(false); setRoleForm({ name:'', description:'' }); fetchAll();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(false); }
  };

  const handleSort = (f) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('asc'); }
    setPage(1);
  };

  const SH = ({ label, field }) => (
    <span onClick={() => handleSort(field)} style={{ cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'0.3rem', userSelect:'none' }}>
      {label} <ArrowUpDown size={11} style={{ opacity: sortField === field ? 1 : 0.3, color: sortField === field ? 'var(--primary-color)' : 'inherit' }} />
    </span>
  );

  const filtered = employees.filter(e => {
    const name = `${e.first_name} ${e.last_name}`.toLowerCase();
    const s = search.toLowerCase();
    return (name.includes(s) || (e.email||'').toLowerCase().includes(s) || String(e.id).toLowerCase().includes(s))
      && (deptFilter === 'all' || String(e.department_id) === deptFilter)
      && (statusFilter === 'all' || e.status === statusFilter);
  });

  const sorted = [...filtered].sort((a, b) => {
    let va = sortField === 'name' ? `${a.first_name} ${a.last_name}`.toLowerCase() : sortField === 'department' ? (a.department_name||'').toLowerCase() : sortField === 'role' ? (a.role_name||'').toLowerCase() : (a[sortField]||'');
    let vb = sortField === 'name' ? `${b.first_name} ${b.last_name}`.toLowerCase() : sortField === 'department' ? (b.department_name||'').toLowerCase() : sortField === 'role' ? (b.role_name||'').toLowerCase() : (b[sortField]||'');
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const total = sorted.length, pages = Math.ceil(total / pageSize);
  const paginated = sorted.slice((page-1)*pageSize, page*pageSize);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h2>Employee Directory</h2>
          <p>Manage workforce profiles, departments, and job roles.</p>
        </div>
        <div className="page-header-actions">
          <Button variant="outline" onClick={() => { setError(''); setShowDeptCard(true); }}><FolderPlus size={15} /> Department</Button>
          <Button variant="outline" onClick={() => { setError(''); setShowRoleCard(true); }}><Award size={15} /> Job Role</Button>
          <Button variant="primary" onClick={openAdd}><UserPlus size={15} /> Add Employee</Button>
        </div>
      </div>

      <Card>
        <div className="table-toolbar">
          <div className="topbar-search-container">
            <Search size={15} className="topbar-search-icon" />
            <input type="text" placeholder="Search ID, name, email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="topbar-search-input" style={{ width: 280 }} />
          </div>
          <div className="table-filters">
            <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }} className="table-select-filter">
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="table-select-filter">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="table-select-filter">
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        <Table
          headers={[<SH label="ID" field="id" />, <SH label="Name" field="name" />, <SH label="Email" field="email" />, <SH label="Department" field="department" />, <SH label="Job Role" field="role" />, <SH label="Status" field="status" />, 'Actions']}
          isEmpty={!loading && paginated.length === 0}
        >
          {loading ? (
            Array.from({ length: pageSize }).map((_, i) => (
              <tr key={i} className="skeleton-row">
                {[70, 130, 180, 110, 110, 65, 60].map((w, j) => <td key={j}><span className="skeleton-text" style={{ width: w }} /></td>)}
              </tr>
            ))
          ) : (
            paginated.map(emp => (
              <tr key={emp.id}>
                <td><span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--primary-color)', fontWeight: 600 }}>{emp.id}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{emp.first_name} {emp.last_name}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{emp.email}</td>
                <td style={{ fontSize: '0.85rem' }}>{emp.department_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                <td style={{ fontSize: '0.85rem' }}>{emp.role_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                <td><span className={`badge ${emp.status === 'active' ? 'badge-success' : 'badge-muted'}`}>{emp.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openEdit(emp)} className="btn btn-ghost btn-icon" title="Edit"><Edit2 size={15} color="var(--primary-color)" /></button>
                    {emp.id !== 'EMP-2026-0001' && (
                      <button onClick={() => handleDelete(emp.id)} className="btn btn-ghost btn-icon" title="Delete"><Trash2 size={15} color="var(--danger-color)" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </Table>

        {!loading && pages > 1 && (
          <div className="pagination-container">
            <span className="pagination-info">Showing {Math.min(total,(page-1)*pageSize+1)}–{Math.min(total,page*pageSize)} of {total} employees</span>
            <div className="pagination-buttons">
              <button className="pagination-btn" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>← Prev</button>
              {Array.from({ length: pages }).map((_,i) => (
                <button key={i} className={`pagination-btn${page===i+1?' pagination-btn-active':''}`} onClick={() => setPage(i+1)}>{i+1}</button>
              ))}
              <button className="pagination-btn" onClick={() => setPage(p => Math.min(pages,p+1))} disabled={page===pages}>Next →</button>
            </div>
          </div>
        )}
      </Card>

      {/* Add/Edit Employee Card */}
      {showEmpCard && (
        <Card style={{ marginTop: '1.5rem', border: '2px solid var(--primary-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)' }}>
              <UserPlus size={18} style={{ verticalAlign: 'text-bottom', marginRight: '0.5rem' }} />
              {empForm.id ? 'Edit Employee Profile' : 'Register New Employee'}
            </h3>
            <button onClick={() => setShowEmpCard(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--text-muted)' }}>
              ✕
            </button>
          </div>
          <form onSubmit={handleEmpSubmit}>
            {error && <div className="alert-error">{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <Input label="First Name" id="first_name" name="first_name" value={empForm.first_name} onChange={e => setEmpForm({ ...empForm, first_name: e.target.value })} required />
              <Input label="Last Name" id="last_name" name="last_name" value={empForm.last_name} onChange={e => setEmpForm({ ...empForm, last_name: e.target.value })} required />
            </div>
            <Input label="Email Address" id="email" name="email" type="email" value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} required />
            {!empForm.id && <Input label="Password" id="password" name="password" type="password" value={empForm.password} onChange={e => setEmpForm({ ...empForm, password: e.target.value })} required />}
            <Input label="Phone" id="phone" name="phone" value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <Input label="Department" id="department_id" name="department_id" type="select" value={empForm.department_id} onChange={e => setEmpForm({ ...empForm, department_id: e.target.value })} options={departments.map(d => ({ value: d.id, label: d.name }))} required />
              <Input label="Job Role" id="role_id" name="role_id" type="select" value={empForm.role_id} onChange={e => setEmpForm({ ...empForm, role_id: e.target.value })} options={roles.map(r => ({ value: r.id, label: r.name }))} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <Input label="Hire Date" id="hire_date" name="hire_date" type="date" value={empForm.hire_date} onChange={e => setEmpForm({ ...empForm, hire_date: e.target.value })} required />
              {empForm.id && <Input label="Status" id="status" name="status" type="select" value={empForm.status} onChange={e => setEmpForm({ ...empForm, status: e.target.value })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} required />}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Button variant="outline" onClick={() => setShowEmpCard(false)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={actionLoading}>Save Changes</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Department Card */}
      {showDeptCard && (
        <Card style={{ marginTop: '1.5rem', border: '2px solid var(--primary-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)' }}>
              <FolderPlus size={18} style={{ verticalAlign: 'text-bottom', marginRight: '0.5rem' }} />
              Create Department
            </h3>
            <button onClick={() => setShowDeptCard(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--text-muted)' }}>
              ✕
            </button>
          </div>
          <form onSubmit={handleDeptSubmit}>
            {error && <div className="alert-error">{error}</div>}
            <Input label="Department Name" id="dept_name" value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} required />
            <Input label="Description" id="dept_desc" type="textarea" value={deptForm.description} onChange={e => setDeptForm({ ...deptForm, description: e.target.value })} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Button variant="outline" onClick={() => setShowDeptCard(false)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={actionLoading}>Create</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Role Card */}
      {showRoleCard && (
        <Card style={{ marginTop: '1.5rem', border: '2px solid var(--primary-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)' }}>
              <Award size={18} style={{ verticalAlign: 'text-bottom', marginRight: '0.5rem' }} />
              Create Job Role
            </h3>
            <button onClick={() => setShowRoleCard(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--text-muted)' }}>
              ✕
            </button>
          </div>
          <form onSubmit={handleRoleSubmit}>
            {error && <div className="alert-error">{error}</div>}
            <Input label="Role Name" id="role_name" value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} required />
            <Input label="Description" id="role_desc" type="textarea" value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Button variant="outline" onClick={() => setShowRoleCard(false)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={actionLoading}>Create</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

export default Employees;
