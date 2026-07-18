import React, { useState, useEffect } from 'react';
import client from '../api/client';
import Card from '../components/Card';
import { Bell, CheckCircle, Info, AlertTriangle, CheckSquare, Inbox } from 'lucide-react';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await client.get('/api/auth/notifications');
      setNotifications(res.data);
    } catch {
      setNotifications([
        { id: 1, title: 'Welcome to ShiftFlow!', message: 'Explore your weekly shift allocations and clock in daily.', is_read: false, created_at: new Date().toISOString() },
        { id: 2, title: 'Automatic Scheduler Success', message: 'Shift allocations for next week have been completed.', is_read: true, created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, title: 'Profile Updated', message: 'Your phone number has been updated successfully.', is_read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
      ]);
    } finally { setLoading(false); }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await client.post(`/api/auth/notifications/${id}/read`);
    } catch {}
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAll = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getIcon = (title) => {
    const t = title.toLowerCase();
    if (t.includes('success') || t.includes('approved') || t.includes('completed')) return <CheckCircle size={20} color="var(--success-color)" />;
    if (t.includes('warning') || t.includes('rejected') || t.includes('caution')) return <AlertTriangle size={20} color="var(--danger-color)" />;
    return <Info size={20} color="var(--primary-color)" />;
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : filter === 'read' ? notifications.filter(n => n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h2>Notifications</h2>
          <p>Stay updated on leaves, shifts, and system events.</p>
        </div>
        <div className="page-header-actions">
          {unreadCount > 0 && (
            <button className="btn btn-outline btn-sm" onClick={handleMarkAll}>
              <CheckSquare size={14} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {['all', 'unread', 'read'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`} style={{ textTransform: 'capitalize' }}>
            {f} {f === 'unread' && unreadCount > 0 && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 9999, padding: '0 5px', marginLeft: 4, fontSize: '0.7rem' }}>{unreadCount}</span>}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem', borderRadius: 8, background: 'var(--bg-subtle)' }}>
                <span className="skeleton-avatar" style={{ width: 40, height: 40 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span className="skeleton-text" style={{ width: '40%' }} />
                  <span className="skeleton-text" style={{ width: '70%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Inbox size={48} className="empty-state-icon" color="var(--text-muted)" />
            <div className="empty-state-title">All caught up!</div>
            <div className="empty-state-desc">No {filter !== 'all' ? filter : ''} notifications to show.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {filtered.map((note, i) => (
              <div key={note.id} className="fade-in" style={{ animationDelay: `${i * 0.04}s`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1rem 1.25rem', borderRadius: 10, border: '1px solid var(--border-color)', background: note.is_read ? 'var(--card-bg)' : 'var(--primary-light)', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ marginTop: 2, flexShrink: 0 }}>{getIcon(note.title)}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{note.title}</span>
                      {!note.is_read && <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>New</span>}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{note.message}</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                </div>
                {!note.is_read && (
                  <button onClick={() => handleMarkAsRead(note.id)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0, marginLeft: '1rem' }}>
                    <CheckSquare size={15} /> Mark read
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

export default Notifications;
