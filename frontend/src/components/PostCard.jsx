import { useState } from 'react';
import '../styles/post.css';
import postApi from '../api/postApi';
import { useAuth } from '../hooks/useAuth';
import CommentSection from './CommentSection';
import getMediaUrl from '../utils/mediaUrl';
import PublicProfileModal from './PublicProfileModal';
import PostDetailModal from './PostDetailModal';

import FormattedText from './FormattedText';

const PostCard = ({
  post,
  onPostDeleted,
  onPostUpdated,
  onNavigateToProfile,
  activeCommentPostId,
  setActiveCommentPostId
}) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(post.user_interaction === 'like');
  const [isDisliked, setIsDisliked] = useState(post.user_interaction === 'dislike');
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [dislikesCount, setDislikesCount] = useState(post.dislikes_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProfileUsername, setSelectedProfileUsername] = useState(null);

  const isAuthor = user?.email === post.user_email;

  const isCommentsExpanded = setActiveCommentPostId
    ? activeCommentPostId === post.id
    : showComments;

  const handleCommentClick = () => {
    const isDesktop = window.innerWidth > 768;
    if (isDesktop) {
      setShowDetailModal(true);
    } else {
      if (setActiveCommentPostId) {
        if (activeCommentPostId === post.id) {
          setActiveCommentPostId(null);
        } else {
          setActiveCommentPostId(post.id);
        }
      } else {
        setShowComments(!showComments);
      }
    }
  };

  const handleAuthorClick = () => {
    const targetUsername = post.user_username || post.username;
    if (targetUsername) {
      if (onNavigateToProfile) {
        onNavigateToProfile(targetUsername);
      } else {
        setSelectedProfileUsername(targetUsername);
      }
    }
  };

  const handleLikeToggle = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await postApi.likePost(post.id);
      setIsLiked(response.user_interaction === 'like');
      setIsDisliked(response.user_interaction === 'dislike');
      setLikesCount(response.likes_count || 0);
      setDislikesCount(response.dislikes_count || 0);
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
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update dislike status');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    setLoading(true);
    setError(null);
    try {
      await postApi.deletePost(post.id);
      if (onPostDeleted) onPostDeleted();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modern-post-card">
        <div className="post-header-bar">
          <div
            className="author-avatar-circle"
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
          <div className="author-details">
            <div className="author-name-row">
              <span
                className="author-name"
                onClick={handleAuthorClick}
                style={{ cursor: 'pointer' }}
                title="View Profile"
              >
                {post.user_name} {post.user_username && <small className="author-username-handle">(@{post.user_username})</small>}
              </span>
              {isAuthor && <span className="author-badge">You</span>}
            </div>
            <span className="post-time font-mono">
              {new Date(post.created_at).toLocaleDateString()} • {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {isAuthor && (
            <button className="btn-icon-delete" onClick={handleDelete} disabled={loading} title="Delete post">
              🗑️
            </button>
          )}
        </div>

        <p className="post-description">
          <FormattedText text={post.description} onNavigateToProfile={onNavigateToProfile} />
        </p>

        {post.image && (
          <div className="post-image-container">
            <img
              src={getMediaUrl(post.image)}
              alt="Post content"
              className="post-image-preview"
            />
          </div>
        )}

        <div className="post-action-bar">
          <div className="interaction-group">
            <button
              className={`btn-action-pill ${isLiked ? 'active-like' : ''}`}
              onClick={handleLikeToggle}
              disabled={loading}
              title="Like"
            >
              <svg className={`action-icon-svg heart-svg ${isLiked ? 'liked' : ''}`} viewBox="0 0 24 24" fill={isLiked ? "#ef4444" : "none"} stroke={isLiked ? "#ef4444" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span className="count-label">{likesCount}</span>
            </button>

            <button
              className={`btn-action-pill ${isDisliked ? 'active-dislike' : ''}`}
              onClick={handleDislikeToggle}
              disabled={loading}
              title="Dislike"
            >
              <svg className={`action-icon-svg dislike-svg ${isDisliked ? 'disliked' : ''}`} viewBox="0 0 24 24" fill={isDisliked ? "#f59e0b" : "none"} stroke={isDisliked ? "#f59e0b" : "currentColor"} strokeWidth="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
              <span className="count-label">{dislikesCount}</span>
            </button>
          </div>

          <button
            className={`btn-comment-toggle ${isCommentsExpanded ? 'active' : ''}`}
            onClick={handleCommentClick}
          >
            <svg className="action-icon-svg comment-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>{isCommentsExpanded ? 'Hide Comments' : 'Comments'}</span>
          </button>
        </div>

        {error && <div className="post-card-error">⚠️ {error}</div>}

        {isCommentsExpanded && (
          <CommentSection
            postId={post.id}
            postOwnerEmail={post.user_email}
            onNavigateToProfile={onNavigateToProfile}
          />
        )}
      </div>

      {/* Detail Modal for Desktop View */}
      {showDetailModal && (
        <PostDetailModal
          post={post}
          onClose={() => setShowDetailModal(false)}
          onPostUpdated={onPostUpdated}
        />
      )}

      {/* Fallback Public Profile Modal when onNavigateToProfile is not passed */}
      {selectedProfileUsername && (
        <PublicProfileModal
          username={selectedProfileUsername}
          onClose={() => setSelectedProfileUsername(null)}
        />
      )}
    </>
  );
};

export default PostCard;
