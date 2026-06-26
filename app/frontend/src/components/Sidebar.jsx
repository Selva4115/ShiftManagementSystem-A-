import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  Clock, 
  FileLock2, 
  TrendingUp, 
  Bell, 
  LogOut 
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'employee'] },
    { name: 'Employees', path: '/employees', icon: Users, roles: ['admin', 'manager'] },
    { name: 'Shift Roster', path: '/shifts', icon: CalendarDays, roles: ['admin', 'manager', 'employee'] },
    { name: 'Attendance', path: '/attendance', icon: Clock, roles: ['admin', 'manager', 'employee'] },
    { name: 'Leaves', path: '/leaves', icon: FileLock2, roles: ['admin', 'manager', 'employee'] },
    { name: 'Reports', path: '/reports', icon: TrendingUp, roles: ['admin', 'manager'] },
    { name: 'Notifications', path: '/notifications', icon: Bell, roles: ['admin', 'manager', 'employee'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside className="sidebar" style={sidebarStyle}>
      <div style={logoContainerStyle}>
        <span style={logoEmojiStyle}>⏱️</span>
        <h2 style={logoTextStyle}>ShiftFlow</h2>
      </div>
      
      <nav style={navStyle}>
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => isActive ? 'active' : ''}
              style={({ isActive }) => ({
                ...linkStyle,
                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)'
              })}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div style={footerStyle}>
        <button onClick={logout} style={logoutButtonStyle}>
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

// Sleek dark-slate design styles
const sidebarStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  bottom: 0,
  width: 'var(--sidebar-width)',
  backgroundColor: '#0f172a', // Deep Slate Gray (complements the main panel)
  borderRight: '1px solid rgba(255, 255, 255, 0.05)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 100,
};

const logoContainerStyle = {
  height: 'var(--topbar-height)',
  display: 'flex',
  alignItems: 'center',
  padding: '0 1.5rem',
  gap: '0.75rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
};

const logoEmojiStyle = {
  fontSize: '1.75rem',
};

const logoTextStyle = {
  fontSize: '1.25rem',
  fontWeight: '800',
  color: '#ffffff',
  letterSpacing: '-0.025em',
};

const navStyle = {
  flexGrow: 1,
  padding: '1.5rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const linkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  fontWeight: '500',
  fontSize: '0.925rem',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
};

const footerStyle = {
  padding: '1.5rem 1rem',
  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
};

const logoutButtonStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  color: '#f87171',
  fontWeight: '600',
  fontSize: '0.925rem',
  cursor: 'pointer',
  transition: 'transform 0.1s, background-color 0.2s',
};

export default Sidebar;
