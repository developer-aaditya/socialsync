import { useState } from 'react';
import '../styles/post.css';
import postApi from '../api/postApi';
import { useAuth } from '../hooks/useAuth';
import CommentSection from './CommentSection';
import getMediaUrl from '../utils/mediaUrl';

const PostCard = ({ post, onPostDeleted, onPostUpdated }) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(post.user_interaction === 'like');
  const [isDisliked, setIsDisliked] = useState(post.user_interaction === 'dislike');
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [dislikesCount, setDislikesCount] = useState(post.dislikes_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    <div className="modern-post-card">
      <div className="post-header-bar">
        <div className="author-avatar-circle">
          {post.user_name ? post.user_name[0].toUpperCase() : 'U'}
        </div>
        <div className="author-details">
          <div className="author-name-row">
            <span className="author-name">{post.user_name}</span>
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

      <p className="post-description">{post.description}</p>

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
          >
            <span>{isLiked ? '❤️' : '🤍'}</span>
            <span className="count-label">{likesCount}</span>
          </button>

          <button
            className={`btn-action-pill ${isDisliked ? 'active-dislike' : ''}`}
            onClick={handleDislikeToggle}
            disabled={loading}
          >
            <span>{isDisliked ? '👎🏻' : '👎'}</span>
            <span className="count-label">{dislikesCount}</span>
          </button>
        </div>

        <button
          className={`btn-comment-toggle ${showComments ? 'active' : ''}`}
          onClick={() => setShowComments(!showComments)}
        >
          <span>💬</span>
          <span>{showComments ? 'Hide Comments' : 'Comments'}</span>
        </button>
      </div>

      {error && <div className="post-card-error">⚠️ {error}</div>}

      {showComments && (
        <CommentSection postId={post.id} postOwnerEmail={post.user_email} />
      )}
    </div>
  );
};

export default PostCard;
