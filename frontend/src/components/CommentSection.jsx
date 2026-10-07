import { useState, useEffect, useRef } from 'react';
import postApi from '../api/postApi';
import userApi from '../api/userApi';
import { useAuth } from '../hooks/useAuth';
import getMediaUrl from '../utils/mediaUrl';
import FormattedText from './FormattedText';
import MentionDropdown from './MentionDropdown';
import PublicProfileModal from './PublicProfileModal';
import '../styles/comments.css';

const isAiModerationError = (msg) => {
  if (!msg || typeof msg !== 'string') return false;
  const lower = msg.toLowerCase();
  return (
    lower.includes('ai moderation') ||
    lower.includes('moderation') ||
    lower.includes('toxicity') ||
    lower.includes('toxic') ||
    lower.includes('inappropriate') ||
    lower.includes('profanity') ||
    lower.includes('hate speech') ||
    lower.includes('rejected by ai')
  );
};

const CommentItem = ({ comment, postId, onCommentAdded, onCommentDeleted, postOwnerEmail, onNavigateToProfile }) => {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [likesCount, setLikesCount] = useState(comment.likes_count || 0);
  const [dislikesCount, setDislikesCount] = useState(comment.dislikes_count || 0);
  const [userInteraction, setUserInteraction] = useState(comment.user_interaction);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCommentatorUsername, setSelectedCommentatorUsername] = useState(null);

  // Mention Autocomplete States for Reply & Debounce Ref
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionQueryState, setMentionQueryState] = useState({ query: '', startIndex: -1, cursorEnd: -1 });

  const replyMentionTimerRef = useRef(null);
  const replyMentionBoxRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (replyMentionBoxRef.current && !replyMentionBoxRef.current.contains(e.target)) {
        setShowMentionDropdown(false);
      }
    };
    if (showMentionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMentionDropdown]);

  const isAuthor = user?.email === comment.user_email;
  const isPostOwner = user?.email === postOwnerEmail;
  const canDelete = isAuthor || isPostOwner;

  const handleCommentatorClick = (e) => {
    e.stopPropagation();
    const targetHandle = comment.user_username || comment.user_name || comment.user_email;
    if (targetHandle) {
      if (onNavigateToProfile) {
        onNavigateToProfile(targetHandle);
      } else {
        setSelectedCommentatorUsername(targetHandle);
      }
    }
  };

  const handleReplyChange = (e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setReplyText(val);

    const textBeforeCursor = val.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (match) {
      const q = match[1];
      setMentionQueryState({
        query: q,
        startIndex: match.index,
        cursorEnd: cursorPos,
      });

      setShowMentionDropdown(true);
      setMentionLoading(true);

      if (replyMentionTimerRef.current) clearTimeout(replyMentionTimerRef.current);

      replyMentionTimerRef.current = setTimeout(async () => {
        try {
          const res = await userApi.searchUsers(q);
          setMentionUsers(res || []);
        } catch (err) {
          console.error('Reply mention search error:', err);
        } finally {
          setMentionLoading(false);
        }
      }, 300);
    } else {
      setShowMentionDropdown(false);
      setMentionLoading(false);
      if (replyMentionTimerRef.current) clearTimeout(replyMentionTimerRef.current);
    }
  };

  const handleSelectReplyMention = (username) => {
    const { startIndex, cursorEnd } = mentionQueryState;
    if (startIndex !== -1) {
      const before = replyText.slice(0, startIndex);
      const after = replyText.slice(cursorEnd);
      const updated = `${before}@${username} `;
      setReplyText(updated);
    }
    setShowMentionDropdown(false);
  };

  const handleLike = async () => {
    try {
      await postApi.likeComment(comment.id);
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
      await postApi.dislikeComment(comment.id);
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
    setShowMentionDropdown(false);
    try {
      await postApi.addComment(postId, replyText, comment.id);
      setReplyText('');
      setShowReplyForm(false);
      window.dispatchEvent(new Event('REFRESH_NOTIFICATIONS'));
      if (onCommentAdded) onCommentAdded();
    } catch (err) {
      const apiErr = err.response?.data?.text?.[0] || err.response?.data?.non_field_errors?.[0] || err.response?.data?.error || 'Failed to submit reply';
      setError(apiErr);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="comment-node">
        <div className="comment-bubble">
          <div className="comment-meta">
            <div
              className="comment-author-box"
              onClick={handleCommentatorClick}
              style={{ cursor: 'pointer' }}
              title="View Profile"
            >
              <img
                src={
                  comment.user_profile_picture
                    ? getMediaUrl(comment.user_profile_picture)
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        comment.user_name || 'User'
                      )}&background=6366f1&color=fff`
                }
                alt={comment.user_name}
                className="comment-author-avatar"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    comment.user_name || 'User'
                  )}&background=6366f1&color=fff`;
                }}
              />
              <span className="comment-author">{comment.user_name || comment.user_email}</span>
            </div>
            <span className="comment-date">
              {new Date(comment.created_at).toLocaleDateString()} at{' '}
              {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <p className="comment-text">
            <FormattedText text={comment.text} onNavigateToProfile={onNavigateToProfile} />
          </p>

          {error && (
            <div className={isAiModerationError(error) ? "ai-moderation-alert" : "form-validation-alert"}>
              {isAiModerationError(error) ? `🛡️ AI Moderation Flag: ${error}` : `⚠️ ${error}`}
            </div>
          )}

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
              <div className="reply-input-box" ref={replyMentionBoxRef} style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  className="reply-input"
                  placeholder={`Replying to ${comment.user_name || comment.user_email}... (Type @ to mention)`}
                  value={replyText}
                  onChange={handleReplyChange}
                  disabled={loading}
                  autoFocus
                />
                {showMentionDropdown && (
                  <MentionDropdown
                    users={mentionUsers}
                    onSelect={handleSelectReplyMention}
                    loading={mentionLoading}
                  />
                )}
              </div>
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
                onNavigateToProfile={onNavigateToProfile}
              />
            ))}
          </div>
        )}
      </div>

      {selectedCommentatorUsername && (
        <PublicProfileModal
          username={selectedCommentatorUsername}
          onClose={() => setSelectedCommentatorUsername(null)}
        />
      )}
    </>
  );
};

const CommentSection = ({ postId, postOwnerEmail, onNavigateToProfile }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Mention Autocomplete States for Main Comment & Debounce Ref
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionQueryState, setMentionQueryState] = useState({ query: '', startIndex: -1, cursorEnd: -1 });

  const mainMentionTimerRef = useRef(null);
  const mainMentionBoxRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mainMentionBoxRef.current && !mainMentionBoxRef.current.contains(e.target)) {
        setShowMentionDropdown(false);
      }
    };
    if (showMentionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMentionDropdown]);

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

  const handleMainCommentChange = (e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewComment(val);

    const textBeforeCursor = val.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (match) {
      const q = match[1];
      setMentionQueryState({
        query: q,
        startIndex: match.index,
        cursorEnd: cursorPos,
      });

      setShowMentionDropdown(true);
      setMentionLoading(true);

      if (mainMentionTimerRef.current) clearTimeout(mainMentionTimerRef.current);

      mainMentionTimerRef.current = setTimeout(async () => {
        try {
          const res = await userApi.searchUsers(q);
          setMentionUsers(res || []);
        } catch (err) {
          console.error('Comment mention search error:', err);
        } finally {
          setMentionLoading(false);
        }
      }, 300);
    } else {
      setShowMentionDropdown(false);
      setMentionLoading(false);
      if (mainMentionTimerRef.current) clearTimeout(mainMentionTimerRef.current);
    }
  };

  const handleSelectMainMention = (username) => {
    const { startIndex, cursorEnd } = mentionQueryState;
    if (startIndex !== -1) {
      const before = newComment.slice(0, startIndex);
      const after = newComment.slice(cursorEnd);
      const updated = `${before}@${username} `;
      setNewComment(updated);
    }
    setShowMentionDropdown(false);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    setError(null);
    setShowMentionDropdown(false);
    try {
      await postApi.addComment(postId, newComment);
      setNewComment('');
      window.dispatchEvent(new Event('REFRESH_NOTIFICATIONS'));
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
        <div className="comment-input-box" ref={mainMentionBoxRef} style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="comment-input"
            placeholder="Write a comment... (Type @ to mention someone)"
            value={newComment}
            onChange={handleMainCommentChange}
            disabled={submitting}
          />
          {showMentionDropdown && (
            <MentionDropdown
              users={mentionUsers}
              onSelect={handleSelectMainMention}
              loading={mentionLoading}
            />
          )}
        </div>
        <button type="submit" className="btn-comment-submit" disabled={submitting || !newComment.trim()}>
          {submitting ? 'Posting...' : 'Comment'}
        </button>
      </form>

      {error && (
        <div className={isAiModerationError(error) ? "ai-moderation-alert main-alert" : "form-validation-alert main-alert"}>
          {isAiModerationError(error) ? (
            <>
              🛡️ <strong>AI Moderation Flag:</strong>{' '}
              {error
                .replace(/^Comment rejected by AI Moderation:\s*/i, '')
                .replace(/^AI Moderation Flagged:\s*/i, '')}
            </>
          ) : (
            <>
              ⚠️ {error}
            </>
          )}
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
              onNavigateToProfile={onNavigateToProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
