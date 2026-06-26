import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { useToast } from '../context/ToastContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleBypassLogin = async (roleEmail, rolePassword, roleName) => {
    setError('');
    setLoading(true);
    const result = await login(roleEmail, rolePassword);
    setLoading(false);
    if (result.success) {
      addToast("Bypass Access Granted", `Logged in using built-in ${roleName} profile.`, "success");
      navigate('/dashboard');
    } else {
      setError(result.message);
      addToast("Bypass Failure", result.message || `Could not execute ${roleName} bypass.`, "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      addToast("Welcome to ShiftFlow", "Authenticated successfully.", "success");
      navigate('/dashboard');
    } else {
      setError(result.message);
      addToast("Login Failed", result.message || "Invalid credentials.", "error");
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle} className="slide-up">
        <div style={logoSectionStyle}>
          <span style={logoEmojiStyle}>⏱️</span>
          <h1 style={logoTitleStyle}>ShiftFlow</h1>
          <p style={subtitleStyle}>Shift Allocation & Attendance Suite</p>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          {error && <div style={errorContainerStyle}>{error}</div>}

          <Input
            label="Email Address"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. admin@shift.com"
            required
          />

          <Input
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            style={{ width: '100%', marginTop: '1rem', padding: '0.85rem' }}
          >
            Sign In
          </Button>

          <div style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: '700', marginBottom: '0.5rem', textAlign: 'center', letterSpacing: '0.05em' }}>
              ⚡ QUICK LOGIN BYPASS
            </p>
            <div className="bypass-grid">
              <button
                type="button"
                className="btn-bypass btn-bypass-admin"
                onClick={() => handleBypassLogin('admin@shiftmanagement.com', 'AdminPassword123', 'Administrator')}
                disabled={loading}
              >
                🛠️ Admin
              </button>
              <button
                type="button"
                className="btn-bypass btn-bypass-manager"
                onClick={() => handleBypassLogin('manager@shiftmanagement.com', 'ManagerPassword123', 'Manager')}
                disabled={loading}
              >
                💼 Manager
              </button>
              <button
                type="button"
                className="btn-bypass btn-bypass-employee"
                onClick={() => handleBypassLogin('employee@shiftmanagement.com', 'EmployeePassword123', 'Employee')}
                disabled={loading}
              >
                👤 Employee
              </button>
            </div>
          </div>
        </form>
        
        <div style={footerStyle}>
          <p style={footerTextStyle}>Admin: <strong>admin@shiftmanagement.com</strong></p>
          <p style={footerTextStyle}>Manager: <strong>manager@shiftmanagement.com</strong></p>
          <p style={footerTextStyle}>Employee: <strong>employee@shiftmanagement.com</strong></p>
          <p style={{ ...footerTextStyle, marginTop: '0.35rem', color: '#8b5cf6' }}>Default Password: <strong>[Role]Password123</strong></p>
        </div>
      </div>
    </div>
  );
};

// Styling for luxury glassmorphism card login
const containerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  width: '100vw',
  background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', // Deep dark blue-indigo gradient
  padding: '1.5rem',
  position: 'fixed',
  top: 0,
  left: 0,
};

const cardStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(16px)',
  borderRadius: '20px',
  width: '100%',
  maxWidth: '420px',
  padding: '2.5rem',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
};

const logoSectionStyle = {
  textAlign: 'center',
  marginBottom: '2rem',
};

const logoEmojiStyle = {
  fontSize: '2.5rem',
  display: 'block',
  marginBottom: '0.5rem',
};

const logoTitleStyle = {
  color: '#ffffff',
  fontSize: '1.75rem',
  fontWeight: '800',
  letterSpacing: '-0.025em',
  marginBottom: '0.25rem',
};

const subtitleStyle = {
  color: '#94a3b8',
  fontSize: '0.875rem',
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
};

const errorContainerStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  color: '#f87171',
  fontSize: '0.85rem',
  fontWeight: '500',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  marginBottom: '1.25rem',
  textAlign: 'center',
};

const footerStyle = {
  marginTop: '2rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  textAlign: 'center',
};

const footerTextStyle = {
  color: '#64748b',
  fontSize: '0.75rem',
  marginBottom: '0.25rem',
};

export default Login;
