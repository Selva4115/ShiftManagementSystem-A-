import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Topbar = ({ title }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  // Timer loop for the live clock widget
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hr = time.getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const formatTime = (t) => {
    return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (t) => {
    return t.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <header style={topbarStyle}>
      <div>
        <h1 style={titleStyle}>{title || 'ShiftFlow Hub'}</h1>
      </div>

      {/* Live Clock & Dynamic Greeting Panel */}
      <div style={clockContainerStyle}>
        <span style={clockDateStyle}>{formatDate(time)}</span>
        <span style={clockTimeStyle}>{formatTime(time)}</span>
        <span style={greetingTextStyle}>— {getGreeting()}</span>
      </div>
      
      <div style={actionsStyle}>
        <button onClick={() => navigate('/notifications')} style={notificationBtnStyle}>
          <Bell size={20} />
        </button>

        <div style={profileStyle}>
          <div style={avatarStyle}>
            {getInitials(user?.name)}
          </div>
          <div style={profileMetaStyle}>
            <span style={nameStyle}>{user?.name || 'User'}</span>
            <span style={roleStyle}>{user?.role === 'admin' ? 'Administrator' : user?.role === 'manager' ? 'Manager' : 'Employee'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

const topbarStyle = {
  position: 'fixed',
  top: 0,
  right: 0,
  left: 'var(--sidebar-width)',
  height: 'var(--topbar-height)',
  backgroundColor: 'var(--card-bg)',
  borderBottom: '1px solid var(--border-color)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 2rem',
  zIndex: 99,
};

const titleStyle = {
  fontSize: '1.25rem',
  fontWeight: '700',
  color: 'var(--text-primary)',
};

const clockContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  backgroundColor: 'var(--bg-color)',
  padding: '0.45rem 1rem',
  borderRadius: '9999px',
  fontSize: '0.85rem',
  fontWeight: '600',
  color: 'var(--text-secondary)',
  boxShadow: 'inset var(--shadow-sm)',
};

const clockDateStyle = {
  color: 'var(--primary-color)',
};

const clockTimeStyle = {
  fontFamily: 'monospace',
  fontSize: '0.9rem',
};

const greetingTextStyle = {
  color: 'var(--text-muted)',
};

const actionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '1.5rem',
};

const notificationBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '0.5rem',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s',
};

const profileStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
};

const avatarStyle = {
  width: '38px',
  height: '38px',
  borderRadius: '50%',
  backgroundColor: 'var(--primary-light)',
  color: 'var(--primary-color)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '700',
  fontSize: '0.9rem',
  border: '2px solid var(--primary-color)',
};

const profileMetaStyle = {
  display: 'flex',
  flexDirection: 'column',
};

const nameStyle = {
  fontSize: '0.9rem',
  fontWeight: '600',
  color: 'var(--text-primary)',
  lineHeight: '1.2',
};

const roleStyle = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  textTransform: 'capitalize',
};

export default Topbar;
