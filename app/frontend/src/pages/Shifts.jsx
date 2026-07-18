import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import Card from '../components/Card';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Button from '../components/Button';
import { Calendar, RefreshCw, Edit, ShieldAlert, ChevronLeft, ChevronRight, Trash2, AlertTriangle, Download } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const formatLocalDate = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getMondayOf = (d) => {
  const copy = new Date(d);
  const dow = copy.getDay();
  copy.setDate(copy.getDate() - (dow === 0 ? 6 : dow - 1));
  return copy;
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const Shifts = () => {
  const { isAdmin, isManager } = useAuth();
  const canEdit = isAdmin || isManager;
  const { addToast } = useToast();

  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('weekly');

  // Weekly navigation
  const [selectedMonday, setSelectedMonday] = useState(() => formatLocalDate(getMondayOf(new Date())));
  const [weekDays, setWeekDays] = useState([]);

  // Monthly navigation
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [selMonth, setSelMonth] = useState(new Date().getMonth());

  // Auto allocator modal
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoMode, setAutoMode] = useState('weekly');
  const [autoDate, setAutoDate] = useState('');
  const [autoYear, setAutoYear] = useState(String(new Date().getFullYear()));
  const [autoMonth, setAutoMonth] = useState(String(new Date().getMonth() + 1));
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoProgress, setAutoProgress] = useState(0);
  const [autoStep, setAutoStep] = useState('');
  const [autoError, setAutoError] = useState('');
  const [autoResult, setAutoResult] = useState(null); // result summary after generation
  // Clear all allocations
  const [clearMode, setClearMode] = useState('week'); // 'week' | 'month' | 'all'
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  // Build week days array
  useEffect(() => {
    const start = new Date(selectedMonday + 'T00:00:00');
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({
        dateStr: formatLocalDate(d),
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        isToday: formatLocalDate(d) === formatLocalDate(new Date())
      });
    }
    setWeekDays(days);
  }, [selectedMonday]);

  // Fetch roster data
  const fetchRoster = useCallback(async () => {
    setLoading(true);
    try {
      let start, end;
      if (viewMode === 'weekly') {
        start = selectedMonday;
        const e = new Date(selectedMonday + 'T00:00:00');
        e.setDate(e.getDate() + 6);
        end = formatLocalDate(e);
      } else {
        start = formatLocalDate(new Date(selYear, selMonth, 1));
        end = formatLocalDate(new Date(selYear, selMonth + 1, 0));
      }
      const [e1, e2, e3] = await Promise.all([
        client.get('/api/employees'),
        client.get('/api/shifts'),
        client.get(`/api/shifts/allocations?start_date=${start}&end_date=${end}`)
      ]);
      setEmployees(e1.data.filter(e => e.status === 'active'));
      setShifts(e2.data);
      setAllocations(e3.data);
    } catch (err) {
      addToast('Error', 'Failed to load roster.', 'error');
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedMonday, selYear, selMonth, addToast]);

  useEffect(() => { fetchRoster(); }, [fetchRoster]);

  // Navigation
  const prevWeek = () => {
    const d = new Date(selectedMonday + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    setSelectedMonday(formatLocalDate(d));
  };
  const nextWeek = () => {
    const d = new Date(selectedMonday + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    setSelectedMonday(formatLocalDate(d));
  };
  const prevMonth = () => {
    if (selMonth === 0) { setSelYear(y => y - 1); setSelMonth(11); }
    else setSelMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selMonth === 11) { setSelYear(y => y + 1); setSelMonth(0); }
    else setSelMonth(m => m + 1);
  };

  const weekLabel = () => {
    const s = new Date(selectedMonday + 'T00:00:00');
    const e = new Date(selectedMonday + 'T00:00:00'); e.setDate(e.getDate() + 6);
    return `${s.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${e.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
  };

  // Open auto allocator — always fresh state
  const openAuto = () => {
    setAutoMode('weekly');
    setAutoDate(selectedMonday);
    setAutoYear(String(selYear));
    setAutoMonth(String(selMonth + 1));
    setAutoRunning(false);
    setAutoProgress(0);
    setAutoStep('');
    setAutoError('');
    setAutoResult(null);
    setClearConfirm(false);
    setClearMode('week');
    setAutoOpen(true);
  };

  // Run auto allocation
  const runAuto = async (e) => {
    e.preventDefault();
    setAutoError('');
    setAutoResult(null);
    setAutoRunning(true);
    setAutoProgress(10);
    setAutoStep('Preparing allocation...');
    try {
      setAutoProgress(30); setAutoStep('Checking approved leaves...');
      console.log('Starting auto allocation...', { autoMode, autoDate, autoYear, autoMonth });
      
      let res;
      if (autoMode === 'monthly') {
        console.log('Calling monthly allocation API...');
        res = await client.post('/api/shifts/allocations/auto/monthly', {
          year: parseInt(autoYear), month: parseInt(autoMonth)
        });
      } else {
        console.log('Calling weekly allocation API with date:', autoDate);
        res = await client.post('/api/shifts/allocations/auto', { start_date: autoDate });
      }
      
      console.log('API response:', res.data);
      setAutoProgress(100); setAutoStep('Roster saved!');
      setAutoResult({
        message: res.data.message || 'Roster generated successfully.',
        allocated: res.data.allocated || 0,
        period: autoMode === 'monthly'
          ? `${MONTH_NAMES[parseInt(autoMonth) - 1]} ${autoYear}`
          : `Week of ${autoDate}`
      });
      setAutoRunning(false);
      fetchRoster();
    } catch (err) {
      console.error('Auto allocation error:', err);
      console.error('Error response:', err.response?.data);
      setAutoRunning(false);
      setAutoProgress(0);
      setAutoStep('');
      setAutoError(err.response?.data?.message || err.message || 'Auto-allocation failed.');
    }
  };

  // Clear all allocations for a period
  const clearAllocations = async () => {
    setClearLoading(true);
    try {
      let start, end;
      if (clearMode === 'week') {
        start = selectedMonday;
        const e = new Date(selectedMonday + 'T00:00:00'); e.setDate(e.getDate() + 6);
        end = formatLocalDate(e);
      } else if (clearMode === 'month') {
        start = formatLocalDate(new Date(selYear, selMonth, 1));
        end = formatLocalDate(new Date(selYear, selMonth + 1, 0));
      } else {
        // all — use a very wide range
        start = '2000-01-01';
        end = '2099-12-31';
      }
      await client.delete(`/api/shifts/allocations/range?start_date=${start}&end_date=${end}`);
      setClearConfirm(false);
      setAutoOpen(false);
      fetchRoster();
      addToast('Cleared', 'All shift allocations removed for the selected period.', 'success');
    } catch (err) {
      addToast('Error', err.response?.data?.message || 'Failed to clear allocations.', 'error');
    } finally { setClearLoading(false); }
  };


  // Download PDF report
  const downloadPDF = async () => {
    try {
      let start, end;
      if (viewMode === 'weekly') {
        start = selectedMonday;
        const e = new Date(selectedMonday + 'T00:00:00');
        e.setDate(e.getDate() + 6);
        end = formatLocalDate(e);
      } else {
        start = formatLocalDate(new Date(selYear, selMonth, 1));
        end = formatLocalDate(new Date(selYear, selMonth + 1, 0));
      }
      
      const response = await client.get(`/api/shifts/report/pdf?start_date=${start}&end_date=${end}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shift_report_${start}_to_${end}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      addToast('Success', 'Shift report downloaded successfully.', 'success');
    } catch (err) {
      addToast('Error', err.response?.data?.message || 'Failed to download report.', 'error');
    }
  };

  const getAlloc = (empId, dateStr) => allocations.find(a => a.employee_id === empId && a.date === dateStr);

  // Build monthly calendar cells
  const buildMonthCells = () => {
    const cells = [];
    const first = new Date(selYear, selMonth, 1);
    const last = new Date(selYear, selMonth + 1, 0);
    const pad = first.getDay() === 0 ? 6 : first.getDay() - 1;
    for (let i = 0; i < pad; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      const dt = new Date(selYear, selMonth, d);
      cells.push({
        dateStr: formatLocalDate(dt), day: d,
        isToday: formatLocalDate(dt) === formatLocalDate(new Date()),
        isWeekend: dt.getDay() === 0 || dt.getDay() === 6
      });
    }
    return cells;
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>Shift Roster</h2>
          <p>View and manage shift allocations across your workforce.</p>
        </div>
        <div className="page-header-actions">
          {/* Weekly / Monthly toggle */}
          <div style={{display:'flex',gap:'0.2rem',background:'var(--bg-subtle)',borderRadius:8,padding:'0.2rem'}}>
            {['weekly','monthly'].map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{padding:'0.35rem 0.85rem',borderRadius:6,border:'none',cursor:'pointer',
                  fontSize:'0.82rem',fontWeight:600,textTransform:'capitalize',
                  background:viewMode===m?'var(--card-bg)':'transparent',
                  color:viewMode===m?'var(--primary-color)':'var(--text-muted)'}}>
                {m}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={downloadPDF}><Download size={15}/> Download PDF</Button>
          {canEdit && (
            <Button variant="outline" onClick={openAuto}><RefreshCw size={15}/> Auto Allocator</Button>
          )}
        </div>
      </div>

      {/* Navigator */}
      <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1.5rem',
        background:'var(--card-bg)',border:'1px solid var(--border-color)',borderRadius:10,
        padding:'0.6rem 1rem',width:'fit-content'}}>
        <Button variant="ghost" size="sm" onClick={viewMode==='weekly'?prevWeek:prevMonth}><ChevronLeft size={16}/></Button>
        <span style={{fontWeight:700,fontSize:'0.9rem',minWidth:220,textAlign:'center',display:'flex',alignItems:'center',gap:'0.5rem'}}>
          <Calendar size={15} color="var(--primary-color)"/>
          {viewMode==='weekly' ? weekLabel() : `${MONTH_NAMES[selMonth]} ${selYear}`}
        </span>
        <Button variant="ghost" size="sm" onClick={viewMode==='weekly'?nextWeek:nextMonth}><ChevronRight size={16}/></Button>
      </div>

      {/* Weekly table */}
      {viewMode === 'weekly' && (
        <Card>
          <div style={{overflowX:'auto'}}>
            <table className="data-table" style={{minWidth:900}}>
              <thead>
                <tr>
                  <th style={{minWidth:180}}>Employee</th>
                  {weekDays.map(d => (
                    <th key={d.dateStr} style={{textAlign:'center',minWidth:100,
                      background:d.isToday?'var(--primary-light)':'',
                      color:d.isToday?'var(--primary-color)':''}}>
                      {d.label}
                      {d.isToday && <span style={{display:'block',fontSize:'0.65rem',fontWeight:700}}>TODAY</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({length:5}).map((_,i) => (
                    <tr key={i}><td><span className="skeleton-text" style={{width:140}}/></td>
                      {weekDays.map((_,j)=><td key={j}><span className="skeleton-text" style={{width:70}}/></td>)}
                    </tr>
                  ))
                ) : employees.length === 0 ? (
                  <tr><td colSpan={8} style={{textAlign:'center',padding:'3rem',color:'var(--text-muted)'}}>No active employees.</td></tr>
                ) : employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
                        <div style={{width:30,height:30,borderRadius:'50%',background:'var(--primary-light)',
                          color:'var(--primary-color)',display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:'0.7rem',fontWeight:700,flexShrink:0}}>
                          {emp.first_name?.[0]}{emp.last_name?.[0]}
                        </div>
                        <div>
                          <div style={{fontWeight:600,fontSize:'0.85rem'}}>{emp.first_name} {emp.last_name}</div>
                          <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{emp.role_name||'Staff'}</div>
                        </div>
                      </div>
                    </td>
                    {weekDays.map(day => {
                      const alloc = getAlloc(emp.id, day.dateStr);
                      return (
                        <td key={day.dateStr} style={{textAlign:'center',verticalAlign:'middle',
                          background:day.isToday?'rgba(37,99,235,0.03)':'',padding:'0.4rem 0.25rem'}}>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
                            {alloc ? (
                              <span style={{background:`${alloc.shift_color}18`,color:alloc.shift_color,
                                  border:`1px solid ${alloc.shift_color}50`,padding:'0.2rem 0.5rem',
                                  borderRadius:6,fontSize:'0.78rem',fontWeight:700,
                                  cursor:'default',whiteSpace:'nowrap'}}>
                                {alloc.shift_name}
                              </span>
                            ) : (
                              <span style={{fontSize:'0.75rem',color:'var(--text-muted)',padding:'0.2rem 0.4rem',
                                  borderRadius:4,background:'var(--bg-subtle)',
                                  cursor:'default'}}>Off</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shifts.length > 0 && (
            <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap',paddingTop:'0.75rem',
              marginTop:'0.75rem',borderTop:'1px solid var(--border-color)'}}>
              {shifts.map(s => (
                <div key={s.id} style={{display:'flex',alignItems:'center',gap:'0.4rem',fontSize:'0.78rem'}}>
                  <div style={{width:10,height:10,borderRadius:3,background:s.color_code}}/>
                  <strong style={{color:s.color_code}}>{s.name}</strong>: {s.start_time} – {s.end_time}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Monthly calendar */}
      {viewMode === 'monthly' && (
        <Card>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'0.25rem',marginBottom:'0.5rem'}}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>(
              <div key={d} style={{textAlign:'center',fontWeight:700,fontSize:'0.75rem',color:'var(--text-muted)',padding:'0.35rem 0'}}>{d}</div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'0.25rem'}}>
            {buildMonthCells().map((cell, idx) => {
              if (!cell) return <div key={`p${idx}`}/>;
              const dayAllocs = allocations.filter(a => a.date === cell.dateStr);
              return (
                <div key={cell.dateStr}
                  style={{border:`1px solid ${cell.isToday?'var(--primary-color)':'var(--border-color)'}`,
                    borderRadius:8,padding:'0.4rem 0.3rem',minHeight:80,
                    background:cell.isWeekend?'var(--bg-subtle)':cell.isToday?'var(--primary-light)':'var(--card-bg)',
                    cursor:'default'}}>
                  <div style={{fontWeight:700,fontSize:'0.78rem',marginBottom:'0.25rem',
                    color:cell.isToday?'var(--primary-color)':cell.isWeekend?'var(--text-muted)':'var(--text-primary)'}}>
                    {cell.day}{cell.isToday&&<span style={{marginLeft:4,fontSize:'0.65rem'}}>•</span>}
                  </div>
                  {dayAllocs.slice(0,3).map(a=>(
                    <div key={a.id} style={{background:`${a.shift_color}18`,color:a.shift_color,
                      border:`1px solid ${a.shift_color}40`,padding:'1px 4px',borderRadius:3,
                      fontSize:'0.65rem',fontWeight:700,marginBottom:2}}>
                      <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.shift_name}</span>
                    </div>
                  ))}
                  {dayAllocs.length>3&&<div style={{fontSize:'0.62rem',color:'var(--text-muted)'}}>+{dayAllocs.length-3} more</div>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── AUTO ALLOCATOR CARD ── */}
      {autoOpen && (
        <Card style={{marginBottom:'1.5rem',border:'2px solid var(--primary-color)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <h3 style={{margin:0,fontSize:'1.1rem',fontWeight:700,color:'var(--primary-color)'}}>
              <RefreshCw size={18} style={{verticalAlign:'text-bottom',marginRight:'0.5rem'}}/>
              Auto Shift Allocator
            </h3>
            <button onClick={() => { if (!autoRunning && !clearLoading) { setAutoOpen(false); } }}
              style={{background:'none',border:'none',cursor:'pointer',padding:'0.25rem',color:'var(--text-muted)'}}>
              ✕
            </button>
          </div>

          {/* ── RUNNING: progress screen ── */}
          {autoRunning && (
            <div style={{textAlign:'center',padding:'2rem 1rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'1rem'}}>
              <div style={{width:52,height:52,border:'4px solid var(--border-color)',borderTopColor:'var(--primary-color)',
                borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
              <div style={{width:'100%',height:8,background:'var(--bg-subtle)',borderRadius:4,overflow:'hidden'}}>
                <div style={{height:'100%',background:'var(--primary-color)',borderRadius:4,
                  width:`${autoProgress}%`,transition:'width 0.5s ease'}}/>
              </div>
              <p style={{margin:0,fontSize:'0.9rem',fontWeight:600,color:'var(--text-primary)'}}>{autoStep}</p>
              <p style={{margin:0,fontSize:'0.75rem',color:'var(--text-muted)'}}>Please wait, do not close this window.</p>
            </div>
          )}

          {/* ── SUCCESS: result summary card ── */}
          {!autoRunning && autoResult && (
            <div>
              <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:10,padding:'1.25rem',marginBottom:'1.25rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.75rem'}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:'#22c55e',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{color:'#fff',fontSize:'1.2rem',fontWeight:700}}>✓</span>
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:'1rem',color:'#166534'}}>Roster Generated Successfully</div>
                    <div style={{fontSize:'0.82rem',color:'#15803d'}}>{autoResult.period}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:'1rem',flexWrap:'wrap'}}>
                  <div style={{background:'#fff',borderRadius:8,padding:'0.6rem 1rem',border:'1px solid #bbf7d0',flex:1,minWidth:100}}>
                    <div style={{fontSize:'1.6rem',fontWeight:800,color:'#16a34a'}}>{autoResult.allocated}</div>
                    <div style={{fontSize:'0.75rem',color:'#166534',fontWeight:600}}>Shifts Allocated</div>
                  </div>
                  <div style={{background:'#fff',borderRadius:8,padding:'0.6rem 1rem',border:'1px solid #bbf7d0',flex:1,minWidth:100}}>
                    <div style={{fontSize:'1.6rem',fontWeight:800,color:'#16a34a'}}>{employees.length}</div>
                    <div style={{fontSize:'0.75rem',color:'#166534',fontWeight:600}}>Employees Covered</div>
                  </div>
                  <div style={{background:'#fff',borderRadius:8,padding:'0.6rem 1rem',border:'1px solid #bbf7d0',flex:1,minWidth:100}}>
                    <div style={{fontSize:'1.6rem',fontWeight:800,color:'#16a34a'}}>{shifts.length}</div>
                    <div style={{fontSize:'0.75rem',color:'#166534',fontWeight:600}}>Shift Types</div>
                  </div>
                </div>
                <p style={{margin:'0.75rem 0 0',fontSize:'0.82rem',color:'#166534'}}>{autoResult.message}</p>
              </div>
              <div style={{display:'flex',gap:'0.75rem'}}>
                <Button variant="outline" onClick={() => { setAutoResult(null); }} style={{flex:1}}>Run Again</Button>
                <Button variant="primary" onClick={() => setAutoOpen(false)} style={{flex:1}}>Done</Button>
              </div>
            </div>
          )}

          {/* ── FORM: configuration card ── */}
          {!autoRunning && !autoResult && (
            <form onSubmit={runAuto}>
              {autoError && (
                <div className="alert-error" style={{marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
                  <AlertTriangle size={15}/> {autoError}
                </div>
              )}

              {/* Professional Header */}
              <div style={{background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',borderRadius:12,padding:'1.5rem',marginBottom:'1.5rem',color:'#fff'}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.75rem'}}>
                  <RefreshCw size={24} style={{color:'#fff'}}/>
                  <div>
                    <div style={{fontSize:'1.25rem',fontWeight:800,margin:0}}>Auto Shift Allocator</div>
                    <div style={{fontSize:'0.85rem',opacity:0.9,margin:0}}>Intelligent shift scheduling system</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:'1rem',marginTop:'1rem',flexWrap:'wrap'}}>
                  <div style={{background:'rgba(255,255,255,0.2)',borderRadius:8,padding:'0.5rem 1rem',flex:1,minWidth:120}}>
                    <div style={{fontSize:'1.5rem',fontWeight:800}}>{employees.length}</div>
                    <div style={{fontSize:'0.75rem',opacity:0.9}}>Active Employees</div>
                  </div>
                  <div style={{background:'rgba(255,255,255,0.2)',borderRadius:8,padding:'0.5rem 1rem',flex:1,minWidth:120}}>
                    <div style={{fontSize:'1.5rem',fontWeight:800}}>{shifts.length}</div>
                    <div style={{fontSize:'0.75rem',opacity:0.9}}>Shift Types</div>
                  </div>
                  <div style={{background:'rgba(255,255,255,0.2)',borderRadius:8,padding:'0.5rem 1rem',flex:1,minWidth:120}}>
                    <div style={{fontSize:'1.5rem',fontWeight:800}}>{autoMode === 'weekly' ? '5' : '20+'}</div>
                    <div style={{fontSize:'0.75rem',opacity:0.9}}>Days/Period</div>
                  </div>
                </div>
              </div>

              {/* Algorithm Info */}
              <div style={{background:'#f8fafc',borderRadius:10,padding:'1.25rem',marginBottom:'1.5rem',
                border:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
                <div style={{fontWeight:700,fontSize:'0.9rem',color:'#1e293b',marginBottom:'0.75rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
                  <Calendar size={16} color='#6366f1'/> Allocation Algorithm
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'0.75rem'}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:'0.5rem'}}>
                    <div style={{width:6,height:6,background:'#10b981',borderRadius:'50%',marginTop:6,flexShrink:0}}/>
                    <div style={{fontSize:'0.82rem',color:'#475569',lineHeight:1.5}}>
                      <strong>Round-Robin Distribution:</strong> Equal workload across cohorts
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'flex-start',gap:'0.5rem'}}>
                    <div style={{width:6,height:6,background:'#10b981',borderRadius:'50%',marginTop:6,flexShrink:0}}/>
                    <div style={{fontSize:'0.82rem',color:'#475569',lineHeight:1.5}}>
                      <strong>Smart Cohorts:</strong> Night, Evening, Morning groups
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'flex-start',gap:'0.5rem'}}>
                    <div style={{width:6,height:6,background:'#10b981',borderRadius:'50%',marginTop:6,flexShrink:0}}/>
                    <div style={{fontSize:'0.82rem',color:'#475569',lineHeight:1.5}}>
                      <strong>5-Day Work Week:</strong> Weekends automatically off
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'flex-start',gap:'0.5rem'}}>
                    <div style={{width:6,height:6,background:'#10b981',borderRadius:'50%',marginTop:6,flexShrink:0}}/>
                    <div style={{fontSize:'0.82rem',color:'#475569',lineHeight:1.5}}>
                      <strong>Optimized Performance:</strong> &lt; 2 second allocation
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning Banner */}
              <div style={{background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:10,padding:'1rem',marginBottom:'1.5rem',
                display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <ShieldAlert size={20} color='#92400e' style={{flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:'0.85rem',color:'#92400e',marginBottom:'0.25rem'}}>
                    Important Notice
                  </div>
                  <div style={{fontSize:'0.82rem',color:'#78350f',margin:0}}>
                    Existing shifts for the selected period will be <strong>cleared and rebuilt</strong>. This action cannot be undone.
                  </div>
                </div>
              </div>

              {/* Mode Selection */}
              <div style={{marginBottom:'1.5rem'}}>
                <label style={{fontSize:'0.85rem',fontWeight:700,color:'#1e293b',display:'block',marginBottom:'0.6rem'}}>
                  📅 Allocation Period
                </label>
                <div style={{display:'flex',gap:'0.75rem',background:'#f1f5f9',padding:'0.4rem',borderRadius:10}}>
                  {['weekly','monthly'].map(m => (
                    <button type="button" key={m} onClick={() => setAutoMode(m)}
                      style={{flex:1,padding:'0.75rem',borderRadius:8,border:'none',cursor:'pointer',
                        fontWeight:700,fontSize:'0.9rem',textTransform:'capitalize',transition:'all 0.2s',
                        background:autoMode===m?'#fff':'transparent',
                        color:autoMode===m?'#4f46e5':'#64748b',
                        boxShadow:autoMode===m?'0 2px 4px rgba(0,0,0,0.1)':'none'}}>
                      {m === 'weekly' ? '📅 Weekly' : '🗓️ Monthly'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Inputs */}
              <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:'1.25rem',marginBottom:'1.5rem'}}>
                {autoMode === 'weekly' ? (
                  <div>
                    <label style={{fontSize:'0.85rem',fontWeight:700,color:'#1e293b',display:'block',marginBottom:'0.6rem'}}>
                      Week Start Date
                    </label>
                    <Input id="autoDate" name="autoDate" type="date"
                      value={autoDate} onChange={e => {
                        const v = e.target.value;
                        if (!v) return;
                        const d = new Date(v + 'T00:00:00');
                        if (!isNaN(d.getTime())) setAutoDate(formatLocalDate(getMondayOf(d)));
                      }} required
                      style={{width:'100%',padding:'0.75rem',fontSize:'0.9rem',borderRadius:8,border:'1px solid #cbd5e1'}}
                    />
                    <div style={{fontSize:'0.75rem',color:'#64748b',marginTop:'0.5rem'}}>
                      💡 Automatically snaps to the nearest Monday
                    </div>
                  </div>
                ) : (
                  <div style={{display:'flex',gap:'1rem'}}>
                    <div style={{flex:1}}>
                      <label style={{fontSize:'0.85rem',fontWeight:700,color:'#1e293b',display:'block',marginBottom:'0.6rem'}}>
                        Year
                      </label>
                      <Input id="autoYear" name="autoYear" type="number"
                        value={autoYear} onChange={e => setAutoYear(e.target.value)} required
                        style={{width:'100%',padding:'0.75rem',fontSize:'0.9rem',borderRadius:8,border:'1px solid #cbd5e1'}}
                      />
                    </div>
                    <div style={{flex:1}}>
                      <label style={{fontSize:'0.85rem',fontWeight:700,color:'#1e293b',display:'block',marginBottom:'0.6rem'}}>
                        Month
                      </label>
                      <Input id="autoMonth" name="autoMonth" type="select"
                        value={autoMonth} onChange={e => setAutoMonth(e.target.value)}
                        options={MONTH_NAMES.map((n,i)=>({value:i+1,label:n}))} required
                        style={{width:'100%',padding:'0.75rem',fontSize:'0.9rem',borderRadius:8,border:'1px solid #cbd5e1'}}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Discard/Clear Section */}
              <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'1.25rem',marginBottom:'1.5rem'}}>
                <div style={{fontWeight:700,fontSize:'0.9rem',color:'#991b1b',marginBottom:'0.75rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
                  <Trash2 size={18} color='#dc2626'/> Discard Allocations
                </div>
                <p style={{margin:'0 0 1rem',fontSize:'0.85rem',color:'#7f1d1d',lineHeight:1.5}}>
                  Permanently remove all shift assignments for a selected period. This action is irreversible.
                </p>
                <div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem',flexWrap:'wrap'}}>
                  {[
                    {key:'week', label:'📅 This Week', desc:'Current week only'},
                    {key:'month', label:'🗓️ This Month', desc:'Current month only'},
                    {key:'all', label:'🗑️ All Time', desc:'All historical data'}
                  ].map(opt => (
                    <button type="button" key={opt.key} onClick={() => setClearMode(opt.key)}
                      style={{flex:1,minWidth:120,padding:'0.6rem 0.75rem',borderRadius:8,border:'2px solid',cursor:'pointer',
                        fontSize:'0.82rem',fontWeight:600,transition:'all 0.2s',textAlign:'left',
                        borderColor:clearMode===opt.key?'#dc2626':'#fecaca',
                        background:clearMode===opt.key?'#dc2626':'#fff',
                        color:clearMode===opt.key?'#fff':'#991b1b',
                        boxShadow:clearMode===opt.key?'0 2px 4px rgba(220,38,38,0.3)':'none'}}>
                      <div>{opt.label}</div>
                      <div style={{fontSize:'0.7rem',opacity:0.8,marginTop:2}}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
                {!clearConfirm ? (
                  <Button type="button" variant="danger" onClick={() => setClearConfirm(true)}
                    style={{width:'100%',padding:'0.75rem',fontSize:'0.9rem',fontWeight:700}}>
                    <Trash2 size={16} style={{marginRight:'0.5rem'}}/> 
                    Discard {clearMode === 'week' ? 'This Week' : clearMode === 'month' ? 'This Month' : 'All'} Allocations
                  </Button>
                ) : (
                  <div style={{background:'#fff',border:'2px solid #fca5a5',borderRadius:8,padding:'1rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.75rem'}}>
                      <AlertTriangle size={20} color='#dc2626'/>
                      <div style={{fontWeight:700,fontSize:'0.9rem',color:'#dc2626'}}>
                        Confirm Deletion
                      </div>
                    </div>
                    <p style={{margin:'0 0 1rem',fontSize:'0.85rem',color:'#7f1d1d',lineHeight:1.5}}>
                      You are about to permanently delete all allocations for <strong>{clearMode === 'week' ? 'the current week' : clearMode === 'month' ? 'the current month' : 'ALL time'}</strong>. This cannot be undone.
                    </p>
                    <div style={{display:'flex',gap:'0.75rem'}}>
                      <Button type="button" variant="outline" onClick={() => setClearConfirm(false)} style={{flex:1,padding:'0.75rem'}}>
                        Cancel
                      </Button>
                      <Button type="button" variant="danger" loading={clearLoading} onClick={clearAllocations} style={{flex:1,padding:'0.75rem',fontWeight:700}}>
                        Yes, Delete Permanently
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{display:'flex',gap:'0.75rem',paddingTop:'0.5rem'}}>
                <Button variant="outline" type="button" onClick={() => setAutoOpen(false)} style={{flex:1,padding:'0.8rem',fontSize:'0.9rem',fontWeight:600}}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" style={{flex:2,padding:'0.8rem',fontSize:'0.9rem',fontWeight:700,
                  background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',border:'none'}}>
                  <RefreshCw size={16} style={{marginRight:'0.5rem'}}/> Generate Roster
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

    </div>
  );
};

export default Shifts;
