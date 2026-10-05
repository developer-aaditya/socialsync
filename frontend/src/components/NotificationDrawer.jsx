import { useState, useEffect } from 'react';
import notificationApi from '../api/notificationApi';
import '../styles/notifications.css';

const NotificationDrawer = ({ isOpen, onClose, unreadCount, onUpdateUnreadCount }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationApi.getNotifications();
      setNotifications(data.notifications || []);
      if (onUpdateUnreadCount) {
        onUpdateUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      if (onUpdateUnreadCount) {
        onUpdateUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      if (onUpdateUnreadCount) {
        onUpdateUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'like': return '❤️';
      case 'dislike': return '👎';
      case 'comment': return '💬';
      case 'reply': return '↩️';
      default: return '🔔';
    }
  };

  const getMessage = (n) => {
    const actor = n.actor_name || n.actor_email;
    switch (n.notification_type) {
      case 'like': return `${actor} liked your post.`;
      case 'dislike': return `${actor} disliked your post.`;
      case 'comment': return `${actor} commented on your post.`;
      case 'reply': return `${actor} replied to your comment.`;
      default: return `${actor} interacted with your content.`;
    }
  };

  return (
    <div className="notif-overlay" onClick={onClose}>
      <div className="notif-drawer" onClick={e => e.stopPropagation()}>
        <div className="notif-header">
          <div className="notif-title-group">
            <h3>Notifications</h3>
            {unreadCount > 0 && <span className="notif-badge-pill">{unreadCount} New</span>}
          </div>
          <div className="notif-header-actions">
            {unreadCount > 0 && (
              <button className="btn-text-action" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
            <button className="btn-close-drawer" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="notif-body">
          {loading ? (
            <div className="notif-skeleton">Loading notifications...</div>
          ) : error ? (
            <div className="notif-error">{error}</div>
          ) : notifications.length === 0 ? (
            <div className="notif-empty">
              <span className="notif-empty-icon">🔔</span>
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                onClick={() => !n.is_read && handleMarkAsRead(n.id)}
              >
                <div className="notif-icon-circle">{getIcon(n.notification_type)}</div>
                <div className="notif-content">
                  <p className="notif-text">{getMessage(n)}</p>
                  <span className="notif-time">
                    {new Date(n.created_at).toLocaleDateString()} at{' '}
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {!n.is_read && <div className="notif-unread-dot" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDrawer;
