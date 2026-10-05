import { useState } from 'react';
import '../styles/post.css';
import postApi from '../api/postApi';
import { useAuth } from '../hooks/useAuth';
import ImageCropperModal from './ImageCropperModal';

const PostForm = ({ onPostCreated }) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
          <textarea
            className="post-textarea"
            placeholder={`What's on your mind, ${user?.full_name?.split(' ')[0]}? (AI Content Screening Active)`}
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />

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
