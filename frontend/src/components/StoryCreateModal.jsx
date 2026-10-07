import { useState, useRef } from 'react';
import '../styles/stories.css';
import storyApi from '../api/storyApi';

const StoryCreateModal = ({ onClose, onStoryCreated }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError('Only JPEG and PNG images are allowed for stories.');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file is too large. Maximum size is 10MB.');
      return;
    }

    setError(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select an image for your story.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await storyApi.createStory(selectedFile, caption);
      if (onStoryCreated) {
        onStoryCreated(res.story);
      }
      onClose();
    } catch (err) {
      console.error('Failed to create story:', err);
      setError(
        err.response?.data?.image?.[0] ||
        err.response?.data?.caption?.[0] ||
        err.response?.data?.detail ||
        'Failed to publish story. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="story-modal-overlay" onClick={onClose}>
      <div className="story-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="story-modal-header">
          <h3>⚡ Create 24h Story</h3>
          <button className="story-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {error && <div className="story-error-banner">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="story-create-form">
          {previewUrl ? (
            <div className="story-preview-container">
              <img src={previewUrl} alt="Story preview" className="story-preview-img" />
              <button
                type="button"
                className="story-remove-img-btn"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                title="Change Image"
              >
                🔄 Replace Image
              </button>
            </div>
          ) : (
            <div
              className={`story-dropzone ${dragActive ? 'drag-active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="dropzone-icon">📸</div>
              <h4>Click or drag & drop a photo</h4>
              <p>Supports JPG, JPEG, PNG (Up to 10MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg, image/png, image/jpg"
                className="hidden-file-input"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
            </div>
          )}

          <div className="story-caption-field">
            <input
              type="text"
              placeholder="Add a caption to your story... (Optional)"
              value={caption}
              maxLength={200}
              onChange={(e) => setCaption(e.target.value)}
              disabled={loading}
              className="story-caption-input"
            />
            <span className="caption-char-count">{caption.length}/200</span>
          </div>

          <div className="story-modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !selectedFile}
            >
              {loading ? 'Publishing...' : '✨ Publish Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoryCreateModal;
