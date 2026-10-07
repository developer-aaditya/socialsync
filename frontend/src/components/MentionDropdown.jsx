import getMediaUrl from '../utils/mediaUrl';
import '../styles/post.css';

const MentionDropdown = ({ users, onSelect, loading }) => {
  return (
    <div className="mention-dropdown-overlay">
      <div className="mention-dropdown-header">
        <div className="mention-header-title">
          <span>👥 MENTION USER</span>
          {users && users.length > 0 && (
            <span className="mention-count-badge">{users.length} available</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mention-dropdown-loading">
          <div className="mention-loading-spinner"></div>
          <span>Searching people...</span>
        </div>
      ) : users && users.length > 0 ? (
        <div className="mention-users-list">
          {users.map((u) => (
            <div
              key={u.id}
              className="mention-user-item"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(u.username);
              }}
            >
              <div className="mention-avatar-wrapper">
                <img
                  src={
                    u.profile_picture
                      ? getMediaUrl(u.profile_picture)
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          u.full_name || u.username
                        )}&background=6366f1&color=fff`
                  }
                  alt={u.username}
                  className="mention-user-avatar"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      u.username
                    )}&background=6366f1&color=fff`;
                  }}
                />
              </div>

              <div className="mention-user-info">
                <span className="mention-user-name">{u.full_name || u.username}</span>
                <span className="mention-user-handle">@{u.username}</span>
              </div>

              <span className="mention-select-hint">↵</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mention-dropdown-empty">
          <span>🔍</span>
          <p>No matching users found</p>
        </div>
      )}
    </div>
  );
};

export default MentionDropdown;
