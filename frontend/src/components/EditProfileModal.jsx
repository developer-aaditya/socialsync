import { useState, useEffect } from 'react';
import getMediaUrl from '../utils/mediaUrl';
import authApi from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import ImageCropperModal from './ImageCropperModal';
import '../styles/profile.css';

const EditProfileModal = ({ isOpen, onClose, onProfileUpdated }) => {
  const { user, dispatch } = useAuth();

  const [fullName, setFullName] = useState('');
  const [description, setDescription] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [college, setCollege] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);

  // Raw Image for 1:1 Cropper
  const [rawImageForCrop, setRawImageForCrop] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setDescription(user.description || '');
      setDateOfBirth(user.date_of_birth || '');
      setCollege(user.college || '');
      setProfilePicturePreview(
        user.profile_picture ? getMediaUrl(user.profile_picture) : null
      );
      setProfilePicture(null);
      setError(null);
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSelectRawPicture = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPG or PNG)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file must be smaller than 5MB');
        return;
      }
      setError(null);
      const url = URL.createObjectURL(file);
      setRawImageForCrop(url);
    }
  };

  const handleCropComplete = (croppedFile, croppedUrl) => {
    setProfilePicture(croppedFile);
    setProfilePicturePreview(croppedUrl);
    setRawImageForCrop(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!fullName.trim()) {
        setError('Full Name is required');
        setLoading(false);
        return;
      }

      const payload = {
        full_name: fullName.trim(),
        description: description ? description.trim() : '',
        date_of_birth: dateOfBirth || null,
        college: college ? college.trim() : null,
      };

      if (profilePicture instanceof File) {
        payload.profile_picture = profilePicture;
      }

      const response = await authApi.updateProfile(payload);

      // Fetch fresh profile data to sync auth context
      let updatedUser;
      try {
        const freshData = await authApi.getProfile();
        updatedUser = freshData?.user || freshData;
      } catch (getErr) {
        console.error('Failed to re-fetch profile:', getErr);
        updatedUser = response?.user || response || { ...user, ...payload };
      }

      dispatch({ type: 'UPDATE_PROFILE', payload: updatedUser });
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });

      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }

      onClose();
    } catch (err) {
      console.error('Profile update failed:', err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.response?.data?.detail ||
          'Failed to update profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="edit-modal-header">
          <h3>✏️ Edit Profile</h3>
          <button className="edit-modal-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Form Body */}
          <div className="edit-modal-body">
            {error && <div className="profile-error">{error}</div>}

            {/* Profile Picture Upload & Cropper Section */}
            <div className="edit-avatar-section">
              <div className="edit-avatar-wrapper">
                <img
                  src={
                    profilePicturePreview ||
                    (user?.profile_picture
                      ? getMediaUrl(user.profile_picture)
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          fullName || user?.username || 'User'
                        )}&background=6366f1&color=fff`)
                  }
                  alt="Profile Preview"
                  className="edit-avatar-img"
                />
                <label htmlFor="modal-avatar-input" className="edit-avatar-badge" title="Crop 1:1 Profile Picture">
                  📷
                </label>
                <input
                  type="file"
                  id="modal-avatar-input"
                  accept="image/*"
                  onChange={handleSelectRawPicture}
                  disabled={loading}
                  style={{ display: 'none' }}
                />
              </div>
              <span className="edit-avatar-hint">Click icon to crop & change profile picture</span>
            </div>

            {/* Full Name */}
            <div className="profile-field">
              <label htmlFor="edit-fullname" className="profile-label">
                Full Name *
              </label>
              <input
                type="text"
                id="edit-fullname"
                className="profile-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                placeholder="Your full name"
                required
              />
            </div>

            {/* Description */}
            <div className="profile-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="edit-description" className="profile-label">
                  Description
                </label>
                <span className="char-count">{description.length}/500</span>
              </div>
              <textarea
                id="edit-description"
                className="profile-textarea"
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* College */}
            <div className="profile-field">
              <label htmlFor="edit-college" className="profile-label">
                College / University
              </label>
              <input
                type="text"
                id="edit-college"
                className="profile-input"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                disabled={loading}
                placeholder="e.g. Stanford University"
              />
            </div>

            {/* Date of Birth */}
            <div className="profile-field">
              <label htmlFor="edit-dob" className="profile-label">
                Date of Birth
              </label>
              <input
                type="date"
                id="edit-dob"
                className="profile-input"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="edit-modal-footer">
            <button
              type="button"
              className="edit-modal-btn btn-discard"
              onClick={onClose}
              disabled={loading}
            >
              Discard
            </button>
            <button
              type="submit"
              className="edit-modal-btn btn-save"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* 1:1 Box Image Cropper Modal */}
      {rawImageForCrop && (
        <ImageCropperModal
          imageUrl={rawImageForCrop}
          lockAspectRatio="1:1"
          isProfileCrop={true}
          onCropComplete={handleCropComplete}
          onClose={() => setRawImageForCrop(null)}
        />
      )}
    </div>
  );
};

export default EditProfileModal;
