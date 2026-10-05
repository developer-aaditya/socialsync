import { useState, useEffect } from 'react';
import postApi from '../api/postApi';
import { useAuth } from '../hooks/useAuth';
import '../styles/comments.css';

const CommentItem = ({ comment, postId, onCommentAdded, onCommentDeleted, postOwnerEmail }) => {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [likesCount, setLikesCount] = useState(comment.likes_count || 0);
  const [dislikesCount, setDislikesCount] = useState(comment.dislikes_count || 0);
  const [userInteraction, setUserInteraction] = useState(comment.user_interaction);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthor = user?.email === comment.user_email;
  const isPostOwner = user?.email === postOwnerEmail;
  const canDelete = isAuthor || isPostOwner;

  const handleLike = async () => {
    try {
      const res = await postApi.likeComment(comment.id);
      if (userInteraction === 'like') {
        setUserInteraction(null);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        if (userInteraction === 'dislike') setDislikesCount(prev => Math.max(0, prev - 1));
        setUserInteraction('like');
        setLikesCount(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDislike = async () => {
    try {
      const res = await postApi.dislikeComment(comment.id);
      if (userInteraction === 'dislike') {
        setUserInteraction(null);
        setDislikesCount(prev => Math.max(0, prev - 1));
      } else {
        if (userInteraction === 'like') setLikesCount(prev => Math.max(0, prev - 1));
        setUserInteraction('dislike');
        setDislikesCount(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await postApi.deleteComment(comment.id);
      if (onCommentDeleted) onCommentDeleted(comment.id);
    } catch (err) {
      alert('Failed to delete comment');
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await postApi.addComment(postId, replyText, comment.id);
      setReplyText('');
      setShowReplyForm(false);
      if (onCommentAdded) onCommentAdded();
    } catch (err) {
      const apiErr = err.response?.data?.text?.[0] || err.response?.data?.non_field_errors?.[0] || err.response?.data?.error || 'Failed to submit reply';
      setError(apiErr);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comment-node">
      <div className="comment-bubble">
        <div className="comment-meta">
          <span className="comment-author">{comment.user_name || comment.user_email}</span>
          <span className="comment-date">
            {new Date(comment.created_at).toLocaleDateString()} at{' '}
            {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <p className="comment-text">{comment.text}</p>

        {error && <div className="ai-moderation-alert">🤖 {error}</div>}

        <div className="comment-actions">
          <button className={`comment-btn ${userInteraction === 'like' ? 'active-like' : ''}`} onClick={handleLike}>
            👍 {likesCount > 0 && likesCount}
          </button>
          <button className={`comment-btn ${userInteraction === 'dislike' ? 'active-dislike' : ''}`} onClick={handleDislike}>
            👎 {dislikesCount > 0 && dislikesCount}
          </button>
          <button className="comment-btn reply-btn" onClick={() => setShowReplyForm(!showReplyForm)}>
            ↩️ Reply
          </button>
          {canDelete && (
            <button className="comment-btn delete-btn" onClick={handleDelete} title="Delete comment">
              🗑️
            </button>
          )}
        </div>

        {showReplyForm && (
          <form className="reply-form" onSubmit={handleReplySubmit}>
            <input
              type="text"
              className="reply-input"
              placeholder={`Replying to ${comment.user_name || comment.user_email}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button type="submit" className="reply-submit-btn" disabled={loading || !replyText.trim()}>
              {loading ? 'Sending...' : 'Post Reply'}
            </button>
          </form>
        )}
      </div>

      {/* Recursive Nested Replies Rendering */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="nested-replies">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              onCommentAdded={onCommentAdded}
              onCommentDeleted={onCommentDeleted}
              postOwnerEmail={postOwnerEmail}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CommentSection = ({ postId, postOwnerEmail }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await postApi.getComments(postId);
      setComments(res.comments || []);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await postApi.addComment(postId, newComment);
      setNewComment('');
      fetchComments();
    } catch (err) {
      const apiErr = err.response?.data?.text?.[0] || err.response?.data?.non_field_errors?.[0] || err.response?.data?.error || 'Failed to add comment';
      setError(apiErr);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="comment-section-wrapper">
      <h4 className="comment-section-title">💬 Discussion ({comments.length})</h4>

      <form className="main-comment-form" onSubmit={handleAddComment}>
        <input
          type="text"
          className="comment-input"
          placeholder="Write a comment... (AI Content Moderation Active)"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={submitting}
        />
        <button type="submit" className="btn-comment-submit" disabled={submitting || !newComment.trim()}>
          {submitting ? 'Posting...' : 'Comment'}
        </button>
      </form>

      {error && (
        <div className="ai-moderation-alert main-alert">
          🛡️ <strong>AI Moderation Flag:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="comments-loading">Loading discussion...</div>
      ) : comments.length === 0 ? (
        <div className="comments-empty">No comments yet. Start the conversation!</div>
      ) : (
        <div className="comments-list">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              onCommentAdded={fetchComments}
              onCommentDeleted={fetchComments}
              postOwnerEmail={postOwnerEmail}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
