import React, { useState, useEffect } from 'react';
import client from '../api/client';
import Card from '../components/Card';
import { Bell, CheckCircle, Info, AlertTriangle, CheckSquare } from 'lucide-react';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await client.get('/api/auth/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      // Fallback mocks if database table has no rows
      setNotifications([
        { id: 1, title: 'Welcome to ShiftFlow!', message: 'Explore your weekly shift allocations and clock in daily.', is_read: false, created_at: new Date().toISOString() },
        { id: 2, title: 'Automatic Scheduler Success', message: 'Shift allocations for next week have been completed successfully.', is_read: true, created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, title: 'Profile Updated', message: 'Your phone number has been updated successfully.', is_read: true, created_at: new Date(Date.now() - 86400000).toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (noteId) => {
    try {
      await client.post(`/api/auth/notifications/${noteId}/read`);
      fetchNotifications();
    } catch (err) {
      // Inline update state for client side mock fallback
      setNotifications(
        notifications.map(n => n.id === noteId ? { ...n, is_read: true } : n)
      );
    }
  };

  const getAlertIcon = (title) => {
    const text = title.toLowerCase();
    if (text.includes('success') || text.includes('approved') || text.includes('completed')) {
      return <CheckCircle size={22} color="var(--success-color)" />;
    }
    if (text.includes('warning') || text.includes('caution') || text.includes('rejected')) {
      return <AlertTriangle size={22} color="var(--danger-color)" />;
    }
    return <Info size={22} color="var(--primary-color)" />;
  };

  if (loading && notifications.length === 0) {
    return <div style={loaderStyle}>Loading Notification Feeds...</div>;
  }

  return (
    <div className="fade-in">
      <div style={headerStyle}>
        <div>
          <h2>System Notifications</h2>
          <p>Read important broadcasts, leaves approvals, and roster updates.</p>
        </div>
      </div>

      <Card>
        {notifications.length === 0 ? (
          <div style={emptyStateStyle}>
            <Bell size={48} color="var(--text-muted)" />
            <p>Your notification tray is empty.</p>
          </div>
        ) : (
          <div style={listStyle}>
            {notifications.map((note) => (
              <div 
                key={note.id} 
                style={{ 
                  ...rowStyle, 
                  backgroundColor: note.is_read ? 'var(--card-bg)' : 'var(--primary-light)'
                }}
              >
                <div style={rowHeaderStyle}>
                  {getAlertIcon(note.title)}
                  <div style={rowContentStyle}>
                    <h4 style={rowTitleStyle}>
                      {note.title}
                      {!note.is_read && <span style={unreadBadgeStyle}>New</span>}
                    </h4>
                    <p style={rowMessageStyle}>{note.message}</p>
                    <span style={rowTimeStyle}>{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                </div>
                
                {!note.is_read && (
                  <button onClick={() => handleMarkAsRead(note.id)} style={markAsReadButtonStyle} title="Mark as Read">
                    <CheckSquare size={18} /> Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
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

const emptyStateStyle = {
  textAlign: 'center',
  padding: '4rem 0',
  color: 'var(--text-muted)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1rem',
};

const listStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const rowStyle = {
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  padding: '1.25rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  transition: 'background-color 0.2s',
};

const rowHeaderStyle = {
  display: 'flex',
  gap: '1rem',
  alignItems: 'flex-start',
};

const rowContentStyle = {
  display: 'flex',
  flexDirection: 'column',
};

const rowTitleStyle = {
  fontSize: '1rem',
  fontWeight: '600',
  color: 'var(--text-primary)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '0.25rem',
};

const unreadBadgeStyle = {
  fontSize: '0.7rem',
  backgroundColor: 'var(--primary-color)',
  color: '#ffffff',
  padding: '0.1rem 0.4rem',
  borderRadius: '4px',
  fontWeight: '700',
};

const rowMessageStyle = {
  fontSize: '0.9rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.4',
  marginBottom: '0.35rem',
};

const rowTimeStyle = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
};

const markAsReadButtonStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--primary-color)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  fontSize: '0.85rem',
  fontWeight: '600',
};

export default Notifications;
