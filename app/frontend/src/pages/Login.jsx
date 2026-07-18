import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';
import client from '../api/client';

/* ── Floating shift card ── */
const FloatCard = ({ top, left, delay, shift, time, color, emoji }) => (
  <div style={{
    position: 'absolute', top, left,
    background: 'rgba(255,255,255,0.07)',
    border: `1px solid ${color}40`,
    borderLeft: `3px solid ${color}`,
    borderRadius: 12,
    padding: '0.75rem 1rem',
    minWidth: 160,
    backdropFilter: 'blur(8px)',
    animation: `floatY 4s ease-in-out ${delay} infinite`,
    boxShadow: `0 8px 24px rgba(0,0,0,0.2)`,
  }}>
    <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{emoji}</div>
    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{shift}</div>
    <div style={{ fontSize: '0.72rem', color: color, fontWeight: 600, marginTop: 2 }}>{time}</div>
  </div>
);

/* ── Live clock ── */
const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(time.getHours()).padStart(2, '0');
  const m = String(time.getMinutes()).padStart(2, '0');
  const s = String(time.getSeconds()).padStart(2, '0');
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#fff', letterSpacing: '0.05em', fontFamily: 'monospace', lineHeight: 1 }}>
        {h}<span style={{ color: '#3b82f6', animation: 'blink 1s step-end infinite' }}>:</span>{m}<span style={{ color: '#3b82f6', animation: 'blink 1s step-end infinite' }}>:</span>{s}
      </div>
      <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', fontWeight: 500 }}>
        {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  );
};

/* ── Animated stat pill ── */
const StatPill = ({ label, value, color }) => (
  <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>{value}</span>
  </div>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      addToast('Welcome back!', 'Authenticated successfully.', 'success');
      navigate('/dashboard');
    } else {
      setError(result.message || 'Invalid credentials.');
      addToast('Login Failed', result.message || 'Invalid credentials.', 'error');
    }
  };

  const handleBypassLogin = async (roleEmail, rolePassword, roleName) => {
    setError('');
    setLoading(true);
    const result = await login(roleEmail, rolePassword);
    setLoading(false);
    if (result.success) {
      addToast('Access Granted', `Logged in as ${roleName}.`, 'success');
      navigate('/dashboard');
    } else {
      setError(result.message || `Could not log in as ${roleName}.`);
      addToast('Login Failed', result.message || `Could not log in as ${roleName}.`, 'error');
    }
  };

  return (
    <>
      {/* Inject keyframes */}
      <style>{`
        @keyframes floatY {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes blink {
          0%,100% { opacity:1; } 50% { opacity:0.2; }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse2 {
          0%,100% { transform: scale(1); opacity:0.6; }
          50% { transform: scale(1.08); opacity:1; }
        }
      `}</style>

      <div style={outerStyle}>

        {/* ── LEFT PANEL ── */}
        <div style={leftPanelStyle}>

          {/* Background circles */}
          <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'rgba(37,99,235,0.08)', top:-100, right:-100, animation:'rotateSlow 20s linear infinite' }} />
          <div style={{ position:'absolute', width:250, height:250, borderRadius:'50%', background:'rgba(20,184,166,0.06)', bottom:80, left:-60, animation:'pulse2 5s ease-in-out infinite' }} />

          {/* Logo */}
          <div style={{ position:'absolute', top:32, left:40, display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#2563eb,#14b8a6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem' }}>⏱️</div>
            <div>
              <div style={{ fontSize:'1.15rem', fontWeight:900, color:'#fff', letterSpacing:'-0.03em' }}>ShiftFlow</div>
              <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.4)', fontWeight:500 }}>HRMS Platform</div>
            </div>
          </div>

          {/* Center content */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'2rem', position:'relative', zIndex:1 }}>

            {/* Live clock */}
            <LiveClock />

            {/* Floating shift cards */}
            <div style={{ position:'relative', width:'100%', height:200 }}>
              <FloatCard top="10px"  left="8%"  delay="0s"    shift="Morning Shift"  time="06:00 – 14:00" color="#f59e0b" emoji="🌅" />
              <FloatCard top="80px" left="45%" delay="1.5s"  shift="Evening Shift"  time="14:00 – 22:00" color="#3b82f6" emoji="🌆" />
              <FloatCard top="20px" left="62%" delay="0.8s"  shift="Night Shift"    time="22:00 – 06:00" color="#10b981" emoji="🌙" />
            </div>

            {/* Live stat pills */}
            <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', justifyContent:'center' }}>
              <StatPill label="Active Staff" value="55"  color="#22c55e" />
              <StatPill label="On Shift"     value="18"  color="#3b82f6" />
              <StatPill label="On Leave"     value="3"   color="#f59e0b" />
            </div>

            {/* Tagline */}
            <p style={{ fontSize:'0.875rem', color:'rgba(255,255,255,0.35)', textAlign:'center', fontWeight:500, letterSpacing:'0.02em' }}>
              Smart shifts. Happy teams. ✨
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={rightPanelStyle}>
          <div style={cardStyle} className="scale-in">

            <div style={{ textAlign:'center', marginBottom:'2rem' }}>
              <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>👋</div>
              <h1 style={{ fontSize:'1.6rem', fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.03em', marginBottom:'0.3rem' }}>Welcome Back!</h1>
              <p style={{ fontSize:'0.875rem', color:'var(--text-muted)' }}>Sign in to manage your shifts & attendance</p>
            </div>

            {error && (
              <div style={{ background:'var(--danger-light)', border:'1px solid rgba(239,68,68,0.2)', color:'var(--danger-dark)', padding:'0.75rem 1rem', borderRadius:8, marginBottom:'1.25rem', fontSize:'0.875rem', fontWeight:500, textAlign:'center' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'0.25rem' }}>
              <Input label="Email Address" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
              <Input label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />

              <Button type="submit" variant="primary" loading={loading} style={{ width:'100%', marginTop:'0.875rem', padding:'0.8rem', fontSize:'0.95rem', borderRadius:10 }}>
                Sign In
              </Button>
            </form>

            {/* Quick login */}
            <div style={{ marginTop:'1.5rem', borderTop:'1px solid var(--border-color)', paddingTop:'1.25rem' }}>
              <p style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--text-muted)', textAlign:'center', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.75rem' }}>
                ⚡ Quick Login
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.5rem' }}>
                <QuickBtn emoji="🛠️" label="Admin" color="#3b82f6" bg="rgba(37,99,235,0.08)" border="rgba(37,99,235,0.25)" onClick={() => handleBypassLogin('admin@shiftmanagement.com','AdminPassword123','Administrator')} disabled={loading} />
                <QuickBtn emoji="💼" label="Manager" color="#0ea5e9" bg="rgba(14,165,233,0.08)" border="rgba(14,165,233,0.25)" onClick={() => handleBypassLogin('manager@shiftmanagement.com','ManagerPassword123','Manager')} disabled={loading} />
                <QuickBtn emoji="👤" label="Employee" color="#22c55e" bg="rgba(34,197,94,0.08)" border="rgba(34,197,94,0.25)" onClick={() => handleBypassLogin('employee@shiftmanagement.com','EmployeePassword123','Employee')} disabled={loading} />
              </div>
            </div>

            {/* Active API Endpoint Debugger */}
            <div style={{ marginTop:'1.25rem', textAlign:'center', fontSize:'0.68rem', color:'var(--text-muted)' }}>
              API Target: <code style={{ color: 'var(--primary-color)', fontFamily: 'monospace' }}>{client.defaults.baseURL || 'Relative (Vite Proxy)'}</code>
            </div>

            {/* Footer */}
            <div style={{ marginTop:'0.75rem', textAlign:'center', fontSize:'0.72rem', color:'var(--text-muted)' }}>
              © 2026 ShiftFlow HRMS · All rights reserved
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const QuickBtn = ({ emoji, label, color, bg, border, onClick, disabled }) => (
  <button type="button" onClick={onClick} disabled={disabled}
    style={{ padding:'0.65rem 0.5rem', borderRadius:10, border:`1px solid ${border}`, background:bg, color, fontSize:'0.78rem', fontWeight:700, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.25rem', transition:'all 0.2s' }}
    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 4px 12px ${color}30`; }}
    onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
  >
    <span style={{ fontSize:'1.1rem' }}>{emoji}</span>
    {label}
  </button>
);

const outerStyle = {
  display:'flex', minHeight:'100vh', width:'100vw',
  position:'fixed', top:0, left:0,
};

const leftPanelStyle = {
  width:'48%',
  background:'linear-gradient(160deg, #060d1a 0%, #0a1628 40%, #0d1f3c 100%)',
  position:'relative', overflow:'hidden',
};

const rightPanelStyle = {
  flex:1,
  background:'var(--bg-color)',
  display:'flex', alignItems:'center', justifyContent:'center',
  padding:'2rem',
};

const cardStyle = {
  width:'100%', maxWidth:'400px',
  background:'var(--card-bg)',
  border:'1px solid var(--border-color)',
  borderRadius:16,
  padding:'2.25rem',
  boxShadow:'var(--shadow-xl)',
};

export default Login;
