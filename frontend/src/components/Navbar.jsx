import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/navbar.css';
import { useAuth } from '../hooks/useAuth';
import { tokenService } from '../utils/tokenService';
import notificationApi from '../api/notificationApi';
import NotificationDrawer from './NotificationDrawer';
import themeService from '../utils/themeService';
import UserSearchBar from './UserSearchBar';
import getMediaUrl from '../utils/mediaUrl';

const Navbar = ({ currentPage, setCurrentPage, onNavigateToProfile, onOpenPost }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, dispatch } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasOpenedSettings, setHasOpenedSettings] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(themeService.getStoredTheme());

  const settingsRef = useRef(null);

  const isHomeActive = location.pathname === '/';
  const isProfileActive =
    location.pathname === '/profile' ||
    (user?.username && location.pathname.toLowerCase() === `/${user.username.toLowerCase()}`);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();

      // Fast 4-second polling for real-time notifications
      const interval = setInterval(fetchUnreadCount, 4000);

      // Re-fetch immediately on window focus, visibility change, or custom event
      const handleRefresh = () => fetchUnreadCount();
      window.addEventListener('focus', handleRefresh);
      document.addEventListener('visibilitychange', handleRefresh);
      window.addEventListener('REFRESH_NOTIFICATIONS', handleRefresh);

      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', handleRefresh);
        document.removeEventListener('visibilitychange', handleRefresh);
        window.removeEventListener('REFRESH_NOTIFICATIONS', handleRefresh);
      };
    }
  }, [isAuthenticated]);

  useEffect(() => {
    themeService.applyTheme(currentTheme);
    const cleanup = themeService.initSystemListener();
    return () => cleanup();
  }, [currentTheme]);

  // Click outside listener to close settings dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const data = await notificationApi.getNotifications();
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleThemeSelect = (selectedTheme) => {
    setCurrentTheme(selectedTheme);
    themeService.setTheme(selectedTheme);
  };

  const toggleSettings = () => {
    setHasOpenedSettings(true);
    setIsSettingsOpen((prev) => !prev);
  };

  const confirmLogout = () => {
    tokenService.clearTokens();
    dispatch({ type: 'LOGOUT' });
    if (setCurrentPage) setCurrentPage('login');
    navigate('/login');
    setShowLogoutConfirm(false);
  };

  const handleSelectUser = (username) => {
    if (onNavigateToProfile) {
      onNavigateToProfile(username);
    } else {
      navigate(`/${username}`);
    }
  };

  const handleHomeClick = () => {
    if (setCurrentPage) setCurrentPage('posts');
    navigate('/');
  };

  const handleProfileClick = () => {
    if (user?.username) {
      if (setCurrentPage) setCurrentPage('profile');
      navigate(`/${user.username}`);
    } else {
      navigate('/profile');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <nav className="glass-navbar">
        <div className="navbar-container">
          {/* Brand Logo */}
          <div className="navbar-brand" onClick={handleHomeClick}>
            <svg
              className="brand-svg-logo"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="brand-text">SocialSync</span>
          </div>

          {/* User Search Bar */}
          <UserSearchBar onSelectUser={handleSelectUser} />

          <div className="navbar-actions">
            {/* Redesigned Home Navigation Button */}
            <button
              className={`nav-home-btn ${isHomeActive ? 'active' : ''}`}
              onClick={handleHomeClick}
              title="Home Feed"
            >
              <div className="home-icon-box">
                <svg
                  className={`nav-icon-svg home-svg ${isHomeActive ? 'active-icon' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 10.5L12 3l9 7.5v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9.5z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span className="nav-label">Home</span>
            </button>

            {/* Notification Bell */}
            <button
              className={`notif-btn ${isNotifOpen ? 'active' : ''}`}
              onClick={() => setIsNotifOpen(true)}
              title="Notifications"
            >
              <svg
                className={`nav-icon-svg bell-svg ${unreadCount > 0 ? 'has-unread' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>

            {/* Profile Chip */}
            <div
              className={`user-profile-chip ${isProfileActive ? 'active' : ''}`}
              onClick={handleProfileClick}
              title="View Profile"
            >
              <div className="user-avatar-small">
                {user?.profile_picture ? (
                  <img
                    src={getMediaUrl(user.profile_picture)}
                    alt={user?.full_name || 'Profile'}
                    className="user-avatar-small-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  user?.full_name ? user.full_name[0].toUpperCase() : 'U'
                )}
              </div>
              <span className="user-chip-name nav-label">{user?.full_name?.split(' ')[0]}</span>
            </div>

            {/* Dynamic Rotating Settings Icon & Popover */}
            <div className="nav-settings-wrapper" ref={settingsRef}>
              <button
                className={`nav-settings-btn ${isSettingsOpen ? 'active' : ''}`}
                onClick={toggleSettings}
                title="Settings"
              >
                <svg
                  className={`nav-icon-svg gear-svg ${
                    isSettingsOpen ? 'rotated-open' : hasOpenedSettings ? 'rotated-close' : ''
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>

              {isSettingsOpen && (
                <div className="settings-dropdown">
                  <div className="settings-dropdown-header">
                    <span>Settings</span>
                  </div>

                  <div className="settings-section">
                    <label className="settings-section-label">Theme Mode</label>
                    <div className="theme-options-group">
                      <button
                        className={`theme-option-pill ${currentTheme === 'default' ? 'active' : ''}`}
                        onClick={() => handleThemeSelect('default')}
                      >
                        <svg className="menu-option-svg monitor-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                        System
                      </button>
                      <button
                        className={`theme-option-pill ${currentTheme === 'light' ? 'active' : ''}`}
                        onClick={() => handleThemeSelect('light')}
                      >
                        <svg className="menu-option-svg sun-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                        Light
                      </button>
                      <button
                        className={`theme-option-pill ${currentTheme === 'dark' ? 'active' : ''}`}
                        onClick={() => handleThemeSelect('dark')}
                      >
                        <svg className="menu-option-svg moon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                        Dark
                      </button>
                    </div>
                  </div>

                  <div className="settings-divider" />

                  <button
                    className="settings-logout-btn"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                  >
                    <svg className="logout-menu-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        unreadCount={unreadCount}
        onUpdateUnreadCount={setUnreadCount}
        onOpenPost={onOpenPost}
        onNavigateToProfile={onNavigateToProfile}
      />

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="logout-confirm-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="logout-confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="logout-confirm-header">
              <svg className="logout-dialog-svg" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <h3>Confirm Logout</h3>
            </div>
            <p className="logout-confirm-text">Are you sure you want to log out?</p>
            <div className="logout-confirm-actions">
              <button
                className="btn-logout-cancel"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn-logout-confirm"
                onClick={confirmLogout}
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
