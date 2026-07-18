import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, CalendarDays, Clock,
  FileLock2, TrendingUp, Bell, LogOut,
  ChevronLeft, ChevronRight, Settings
} from 'lucide-react';

const Sidebar = ({ collapsed, toggleCollapsed }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { name: 'Dashboard',    path: '/dashboard',     icon: LayoutDashboard, roles: ['admin','manager','employee'] },
    { name: 'Employees',    path: '/employees',     icon: Users,           roles: ['admin','manager'] },
    { name: 'Shift Roster', path: '/shifts',        icon: CalendarDays,    roles: ['admin','manager','employee'] },
    { name: 'Attendance',   path: '/attendance',    icon: Clock,           roles: ['admin','manager','employee'] },
    { name: 'Leaves',       path: '/leaves',        icon: FileLock2,       roles: ['admin','manager','employee'] },
    { name: 'Reports',      path: '/reports',       icon: TrendingUp,      roles: ['admin','manager'] },
    { name: 'Notifications',path: '/notifications', icon: Bell,            roles: ['admin','manager','employee'] },
  ];

  const filtered = menuItems.filter(i => i.roles.includes(user?.role));

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <aside className="sidebar" style={{ width: collapsed ? '72px' : 'var(--sidebar-width)' }}>
      {/* Logo */}
      <div className="sidebar-logo-area" style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '0' : '0 1.5rem' }}>
        <span className="sidebar-logo-icon">⏱️</span>
        {!collapsed && (
          <div>
            <div className="sidebar-logo-text">ShiftFlow</div>
            <div className="sidebar-logo-sub">HRMS Platform</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {filtered.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              title={collapsed ? item.name : ''}
              className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
            >
              <Icon size={18} className="nav-icon" />
              {!collapsed && <span className="nav-label">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      {!collapsed && (
        <div className="sidebar-user-section">
          <div className="sidebar-user-avatar">{getInitials(user?.name)}</div>
          <div style={{ overflow: 'hidden' }}>
            <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'User'}
            </div>
            <div className="sidebar-user-role">{user?.role || 'employee'}</div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          onClick={toggleCollapsed}
          className="collapse-btn"
          style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
        </button>
        <button
          onClick={logout}
          className="logout-btn"
          style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
          title={collapsed ? 'Log Out' : ''}
        >
          <LogOut size={16} />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
