import { useState, useEffect, useRef } from 'react';
import '../styles/post.css';
import postApi from '../api/postApi';
import userApi from '../api/userApi';
import { useAuth } from '../hooks/useAuth';
import ImageCropperModal from './ImageCropperModal';
import MentionDropdown from './MentionDropdown';

const PostForm = ({ onPostCreated }) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mention Autocomplete States & Debounce Ref
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionQueryState, setMentionQueryState] = useState({ query: '', startIndex: -1, cursorEnd: -1 });

  const mentionTimerRef = useRef(null);
  const mentionBoxRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mentionBoxRef.current && !mentionBoxRef.current.contains(e.target)) {
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

  const handleDescriptionChange = (e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setDescription(val);

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

      if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current);

      mentionTimerRef.current = setTimeout(async () => {
        try {
          const res = await userApi.searchUsers(q);
          setMentionUsers(res || []);
        } catch (err) {
          console.error('Mention search error:', err);
        } finally {
          setMentionLoading(false);
        }
      }, 300);
    } else {
      setShowMentionDropdown(false);
      setMentionLoading(false);
      if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current);
    }
  };

  const handleSelectMention = (username) => {
    const { startIndex, cursorEnd } = mentionQueryState;
    if (startIndex !== -1) {
      const before = description.slice(0, startIndex);
      const after = description.slice(cursorEnd);
      const updated = `${before}@${username} `;
      setDescription(updated);
    }
    setShowMentionDropdown(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size exceeds maximum limit of 10MB.');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleCropComplete = (croppedFile, croppedUrl) => {
    setImage(croppedFile);
    setImagePreview(croppedUrl);
    setShowCropper(false);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const formatErrorMessage = (rawMsg) => {
    if (!rawMsg) return 'Failed to publish post.';
    return rawMsg
      .replace(/^Post rejected by AI Moderation:\s*/i, '')
      .replace(/^AI Moderation Flagged:\s*/i, '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please write something in your post.');
      return;
    }

    setLoading(true);
    setError(null);
    setShowMentionDropdown(false);

    try {
      const res = await postApi.createPost(description, image);
      const createdPost = res.post || res;

      setDescription('');
      setImage(null);
      setImagePreview(null);

      // Pass new created post directly to parent for instant feed insertion
      if (onPostCreated) onPostCreated(createdPost);
    } catch (err) {
      const apiErr =
        err.response?.data?.description?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.error ||
        'Failed to publish post.';
      setError(formatErrorMessage(apiErr));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modern-post-form-card">
        <div className="post-form-header">
          <div className="user-avatar-form">
            {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
          </div>
          <div className="form-header-info">
            <span className="user-form-name">{user?.full_name}</span>
            <span className="ai-shield-badge">🛡️ AI Moderation Protected</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="textarea-mention-box" ref={mentionBoxRef} style={{ position: 'relative' }}>
            <textarea
              className="post-textarea"
              placeholder={`What's on your mind, ${user?.full_name?.split(' ')[0]}? (Type @ to mention someone)`}
              rows="3"
              value={description}
              onChange={handleDescriptionChange}
              disabled={loading}
            />

            {/* Mention Autocomplete Overlay attached directly under textarea */}
            {showMentionDropdown && (
              <MentionDropdown
                users={mentionUsers}
                onSelect={handleSelectMention}
                loading={mentionLoading}
              />
            )}
          </div>

          {imagePreview && (
            <div className="image-preview-wrapper">
              <img src={imagePreview} alt="Selected upload" className="image-preview" />
              <div className="preview-action-overlay">
                <button type="button" className="btn-crop-overlay" onClick={() => setShowCropper(true)}>
                  ✂️ Crop Image
                </button>
                <button type="button" className="btn-remove-preview" onClick={removeImage} title="Remove image">
                  ×
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="ai-moderation-alert">
              🛡️ <strong>AI Moderation Flag:</strong> {error}
            </div>
          )}

          <div className="post-form-footer">
            <label className="btn-upload-label">
              📷 <span>{image ? 'Change Image' : 'Add Photo'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleImageChange}
                disabled={loading}
                hidden
              />
            </label>

            <button type="submit" className="btn-publish-post" disabled={loading || !description.trim()}>
              {loading ? 'Publishing...' : 'Publish Post 🚀'}
            </button>
          </div>
        </form>
      </div>

      {showCropper && imagePreview && (
        <ImageCropperModal
          imageUrl={imagePreview}
          onCropComplete={handleCropComplete}
          onClose={() => setShowCropper(false)}
        />
      )}
    </>
  );
};

export default PostForm;
