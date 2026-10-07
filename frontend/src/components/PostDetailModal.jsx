import { useState, useEffect } from 'react';
import '../styles/post-detail-modal.css';
import postApi from '../api/postApi';
import { useAuth } from '../hooks/useAuth';
import CommentSection from './CommentSection';
import getMediaUrl from '../utils/mediaUrl';
import PublicProfileModal from './PublicProfileModal';
import FormattedText from './FormattedText';

const PostDetailModal = ({ post: initialPost, onClose, onPostUpdated, onNavigateToProfile }) => {
  const { user } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [isLiked, setIsLiked] = useState(initialPost.user_interaction === 'like');
  const [isDisliked, setIsDisliked] = useState(initialPost.user_interaction === 'dislike');
  const [likesCount, setLikesCount] = useState(initialPost.likes_count || 0);
  const [dislikesCount, setDislikesCount] = useState(initialPost.dislikes_count || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !selectedUser) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectedUser]);

  const isAuthor = user?.email === post.user_email;

  const handleLikeToggle = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await postApi.likePost(post.id);
      setIsLiked(response.user_interaction === 'like');
      setIsDisliked(response.user_interaction === 'dislike');
      setLikesCount(response.likes_count || 0);
      setDislikesCount(response.dislikes_count || 0);
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update like status');
    } finally {
      setLoading(false);
    }
  };

  const handleDislikeToggle = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await postApi.dislikePost(post.id);
      setIsLiked(response.user_interaction === 'like');
      setIsDisliked(response.user_interaction === 'dislike');
      setLikesCount(response.likes_count || 0);
      setDislikesCount(response.dislikes_count || 0);
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update dislike status');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorClick = () => {
    const handle = post.user_username || post.username;
    if (handle) {
      if (onNavigateToProfile) {
        onNavigateToProfile(handle);
        onClose();
      } else {
        setSelectedUser(handle);
      }
    }
  };

  return (
    <>
      <div className="post-detail-overlay" onClick={onClose}>
        <div className="post-detail-card" onClick={(e) => e.stopPropagation()}>
          {/* Mobile Full Page Header Bar */}
          <div className="post-detail-mobile-header">
            <button className="mobile-header-back-btn" onClick={onClose} title="Back">
              ← Back
            </button>
            <span className="mobile-header-title">Post Details</span>
            <button className="mobile-header-close-btn" onClick={onClose} title="Close">
              ✕
            </button>
          </div>

          <button className="post-detail-close-btn" onClick={onClose} title="Close (Esc)">
            ✕
          </button>

          <div className="post-detail-grid">
            {/* Left Side: Media Display */}
            <div className="post-detail-media-container" onDoubleClick={handleLikeToggle}>
              {post.image ? (
                <img
                  src={getMediaUrl(post.image)}
                  alt="Post content"
                  className="post-detail-image"
                />
              ) : (
                <div className="post-detail-text-only">
                  <span className="quote-mark">“</span>
                  <p><FormattedText text={post.description} onNavigateToProfile={onNavigateToProfile} /></p>
                </div>
              )}
            </div>

            {/* Right Side: Details & Comments */}
            <div className="post-detail-sidebar">
              {/* Header: Author Details */}
              <div className="post-detail-header">
                <div
                  className="detail-avatar-circle"
                  onClick={handleAuthorClick}
                  style={{ cursor: 'pointer' }}
                  title="View Profile"
                >
                  <img
                    src={
                      post.user_profile_picture
                        ? getMediaUrl(post.user_profile_picture)
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            post.user_name || post.user_username || 'User'
                          )}&background=6366f1&color=fff`
                    }
                    alt={post.user_name}
                    className="author-avatar-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        post.user_name || 'User'
                      )}&background=6366f1&color=fff`;
                    }}
                  />
                </div>
                <div className="detail-author-info">
                  <span
                    className="detail-author-name"
                    onClick={handleAuthorClick}
                    style={{ cursor: 'pointer' }}
                    title="View Profile"
                  >
                    {post.user_name}
                  </span>
                  {post.user_username && (
                    <span className="detail-author-handle" onClick={handleAuthorClick}>
                      @{post.user_username}
                    </span>
                  )}
                </div>
                {isAuthor && <span className="author-badge">You</span>}
              </div>

              {/* Description & Metadata */}
              <div className="post-detail-body">
                <p className="detail-description"><FormattedText text={post.description} onNavigateToProfile={onNavigateToProfile} /></p>
                <span className="detail-timestamp">
                  📅 {new Date(post.created_at).toLocaleDateString()} at{' '}
                  {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Action Bar (Likes, Dislikes) */}
              <div className="post-detail-actions">
                <button
                  className={`btn-action-pill ${isLiked ? 'active-like' : ''}`}
                  onClick={handleLikeToggle}
                  disabled={loading}
                >
                  <span>{isLiked ? '❤️' : '🤍'}</span>
                  <span className="count-label">{likesCount} Likes</span>
                </button>

                <button
                  className={`btn-action-pill ${isDisliked ? 'active-dislike' : ''}`}
                  onClick={handleDislikeToggle}
                  disabled={loading}
                >
                  <span>{isDisliked ? '👎🏻' : '👎'}</span>
                  <span className="count-label">{dislikesCount} Dislikes</span>
                </button>
              </div>

              {error && <div className="detail-error">⚠️ {error}</div>}

              {/* Comments Section */}
              <div className="post-detail-comments-wrapper">
                <h4 className="comments-heading">💬 Comments</h4>
                <CommentSection postId={post.id} postOwnerEmail={post.user_email} onNavigateToProfile={onNavigateToProfile} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal when author handle is clicked */}
      {selectedUser && (
        <PublicProfileModal
          username={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </>
  );
};

export default PostDetailModal;
