import { useState, useEffect } from 'react';
import '../styles/navbar.css';
import { useAuth } from '../hooks/useAuth';
import { tokenService } from '../utils/tokenService';
import notificationApi from '../api/notificationApi';
import NotificationDrawer from './NotificationDrawer';
import themeService from '../utils/themeService';

const Navbar = ({ currentPage, setCurrentPage }) => {
  const { isAuthenticated, user, dispatch } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(themeService.getStoredTheme());

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    themeService.applyTheme(currentTheme);
    const cleanup = themeService.initSystemListener();
    return () => cleanup();
  }, [currentTheme]);

  const fetchUnreadCount = async () => {
    try {
      const data = await notificationApi.getNotifications();
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleThemeChange = (e) => {
    const selected = e.target.value;
    setCurrentTheme(selected);
    themeService.setTheme(selected);
  };

  const handleLogout = () => {
    tokenService.clearTokens();
    dispatch({ type: 'LOGOUT' });
    setCurrentPage('login');
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <nav className="glass-navbar">
        <div className="navbar-container">
          <div className="navbar-brand" onClick={() => setCurrentPage('posts')}>
            <span className="brand-icon">⚡</span>
            <span className="brand-text">SocialSync</span>
          </div>

          <div className="navbar-actions">
            <button
              className={`nav-link-btn ${currentPage === 'posts' ? 'active' : ''}`}
              onClick={() => setCurrentPage('posts')}
            >
              <span className="nav-icon">📰</span> Feed
            </button>

            {/* Theme Selector */}
            <div className="theme-selector-wrapper">
              <select
                className="theme-select"
                value={currentTheme}
                onChange={handleThemeChange}
                title="Select Theme Mode"
              >
                <option value="default">💻 System Default</option>
                <option value="light">☀️ Light Theme</option>
                <option value="dark">🌙 Dark Theme</option>
              </select>
            </div>

            {/* Notification Bell */}
            <button className="notif-btn" onClick={() => setIsNotifOpen(true)} title="Notifications">
              <span className="notif-bell-icon">🔔</span>
              {unreadCount > 0 && <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>

            {/* Profile Chip */}
            <div className="user-profile-chip" onClick={() => setCurrentPage('profile')} title="View Profile">
              <div className="user-avatar-small">
                {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
              </div>
              <span className="user-chip-name">{user?.full_name?.split(' ')[0]}</span>
            </div>

            {/* Logout Button */}
            <button className="nav-logout-btn" onClick={handleLogout} title="Logout">
              ➜]
            </button>
          </div>
        </div>
      </nav>

      <NotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        unreadCount={unreadCount}
        onUpdateUnreadCount={setUnreadCount}
      />
    </>
  );
};

export default Navbar;
