import { useState, useEffect } from 'react';
import '../styles/profile.css';
import userApi from '../api/userApi';
import getMediaUrl from '../utils/mediaUrl';

const FollowListModal = ({ username, type, onClose, onSelectUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (username && type) {
      fetchList();
    }
  }, [username, type]);

  const fetchList = async () => {
    try {
      setLoading(true);
      setError(null);
      let data = [];
      if (type === 'followers') {
        data = await userApi.getFollowers(username);
      } else if (type === 'following') {
        data = await userApi.getFollowing(username);
      }
      setUsers(data || []);
    } catch (err) {
      console.error(`Failed to fetch ${type}:`, err);
      setError(`Could not load ${type} list`);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (targetUsername) => {
    onClose();
    if (onSelectUser) onSelectUser(targetUsername);
  };

  const title = type === 'followers' ? 'Followers' : 'Following';

  return (
    <div className="follow-modal-overlay" onClick={onClose}>
      <div className="follow-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="follow-modal-header">
          <h4>👥 @{username}'s {title} ({users.length})</h4>
          <button className="profile-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className="follow-modal-body">
          {loading ? (
            <div className="follow-loading">
              <div className="spinner-small" />
              <span>Loading {title.toLowerCase()}...</span>
            </div>
          ) : error ? (
            <div className="follow-error">⚠️ {error}</div>
          ) : users.length === 0 ? (
            <div className="follow-empty">
              <span>👥</span>
              <p>No {title.toLowerCase()} found.</p>
            </div>
          ) : (
            <div className="follow-user-list">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="follow-user-item"
                  onClick={() => handleUserClick(u.username)}
                >
                  <img
                    src={
                      u.profile_picture
                        ? getMediaUrl(u.profile_picture)
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            u.full_name || u.username
                          )}&background=6366f1&color=fff`
                    }
                    alt={u.username}
                    className="follow-user-avatar"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        u.username
                      )}&background=6366f1&color=fff`;
                    }}
                  />
                  <div className="follow-user-meta">
                    <span className="follow-user-fullname">
                      {u.full_name || u.username}
                    </span>
                    <span className="follow-user-handle">@{u.username}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowListModal;
