import { useState, useEffect } from 'react';
import '../styles/stories.css';
import storyApi from '../api/storyApi';
import getMediaUrl from '../utils/mediaUrl';

const StoryViewersModal = ({ storyId, onClose }) => {
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchViewers();
  }, [storyId]);

  const fetchViewers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await storyApi.getStoryViewers(storyId);
      setViewers(res.viewers || []);
    } catch (err) {
      console.error('Failed to fetch story viewers:', err);
      setError(err.response?.data?.error || 'Could not load viewers list');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="viewers-modal-overlay" onClick={onClose}>
      <div className="viewers-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="viewers-modal-header">
          <h4>👁️ Story Viewers ({viewers.length})</h4>
          <button className="viewers-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className="viewers-body">
          {loading ? (
            <div className="viewers-loading">
              <div className="spinner-small" />
              <span>Loading viewers...</span>
            </div>
          ) : error ? (
            <div className="viewers-error">⚠️ {error}</div>
          ) : viewers.length === 0 ? (
            <div className="viewers-empty">
              <span>👀</span>
              <p>No views yet. Share your story with friends!</p>
            </div>
          ) : (
            <div className="viewers-list">
              {viewers.map((viewer) => (
                <div key={viewer.id} className="viewer-item">
                  <img
                    src={
                      viewer.profile_picture
                        ? getMediaUrl(viewer.profile_picture)
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            viewer.full_name || viewer.username
                          )}&background=6366f1&color=fff`
                    }
                    alt={viewer.username}
                    className="viewer-avatar"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        viewer.username
                      )}&background=6366f1&color=fff`;
                    }}
                  />
                  <div className="viewer-info">
                    <span className="viewer-name">
                      {viewer.full_name || `@${viewer.username}`}
                    </span>
                    <span className="viewer-username">@{viewer.username}</span>
                  </div>
                  <span className="viewer-time">{formatTimeAgo(viewer.viewed_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryViewersModal;
