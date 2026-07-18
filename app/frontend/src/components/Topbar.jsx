import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Sun, Moon, Search, Menu, ChevronDown, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Topbar = ({ title, collapsed, toggleCollapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (t) => t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (t) => t.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const getGreeting = () => {
    const h = time.getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const leftPos = collapsed ? '72px' : 'var(--sidebar-width)';

  return (
    <header className="topbar" style={{ left: leftPos }}>
      {/* Left */}
      <div className="topbar-left">
        <button className="topbar-hamburger" onClick={toggleCollapsed} title="Toggle sidebar">
          <Menu size={20} />
        </button>
        <div>
          <div className="topbar-page-title">{title || 'ShiftFlow'}</div>
          <div className="topbar-breadcrumb">
            <span>Home</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-breadcrumb-active">{title || 'Overview'}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="topbar-search-container">
        <Search size={15} className="topbar-search-icon" />
        <input type="text" placeholder="Search employees, shifts..." className="topbar-search-input" />
      </div>

      {/* Clock */}
      <div className="topbar-clock">
        <span style={{ color: 'var(--primary-color)', fontWeight: 700 }}>{formatDate(time)}</span>
        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{formatTime(time)}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>— {getGreeting()}</span>
      </div>

      {/* Actions */}
      <div className="topbar-actions">
        <button className="topbar-icon-btn" onClick={() => { setDropdownOpen(false); document.documentElement.setAttribute('data-theme', theme === 'light' ? 'dark' : 'light'); localStorage.setItem('theme', theme === 'light' ? 'dark' : 'light'); setTheme(t => t === 'light' ? 'dark' : 'light'); }} title="Toggle theme">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button className="topbar-icon-btn" onClick={() => navigate('/notifications')} title="Notifications">
          <Bell size={18} />
          <span className="topbar-notif-badge" />
        </button>

        {/* Profile dropdown */}
        <div className="profile-dropdown-container" ref={dropdownRef}>
          <div className="profile-trigger" onClick={() => setDropdownOpen(o => !o)}>
            <div className="profile-avatar">{getInitials(user?.name)}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="profile-name">{user?.name || 'User'}</span>
              <span className="profile-role">{user?.role === 'admin' ? 'Administrator' : user?.role === 'manager' ? 'Manager' : 'Employee'}</span>
            </div>
            <ChevronDown size={13} style={{ color: 'var(--text-muted)', marginLeft: '2px', transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
          </div>

          {dropdownOpen && (
            <div className="profile-dropdown-menu">
              <div className="profile-dropdown-header">
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{user?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>{user?.email}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--primary-color)', fontWeight: 700, marginTop: '4px' }}>ID: {user?.employee_id || 'N/A'}</div>
              </div>
              <button className="profile-dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/dashboard'); }}>
                <User size={14} /> My Profile
              </button>
              <button className="profile-dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/notifications'); }}>
                <Bell size={14} /> Notifications
              </button>
              <div className="dropdown-divider" />
              <button className="profile-dropdown-item danger" onClick={() => { setDropdownOpen(false); logout(); navigate('/login'); }}>
                <LogOut size={14} /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
