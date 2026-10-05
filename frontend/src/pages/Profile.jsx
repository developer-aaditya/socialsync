import { useState, useEffect } from "react";
import getMediaUrl from "../utils/mediaUrl";
import "../styles/profile.css";
import { useAuth } from "../hooks/useAuth";
import authApi from "../api/authApi";

const Profile = () => {
  const { user, dispatch } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth || "");
  const [college, setCollege] = useState(user?.college || "");
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(
    user?.profile_picture ? getMediaUrl(user.profile_picture) : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Update local state when user changes
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setDateOfBirth(user.date_of_birth || "");
      setCollege(user.college || "");
      setProfilePicturePreview(
        user.profile_picture ? getMediaUrl(user.profile_picture) : null,
      );
      setProfilePicture(null);
    }
  }, [user]);

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }

      setProfilePicture(file);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate input
      if (!fullName.trim()) {
        setError("Full name cannot be empty");
        setLoading(false);
        return;
      }

      // Validate age if date of birth is provided (must be 18 or older)
      if (dateOfBirth) {
        const birthDate = new Date(dateOfBirth);
        const today = new Date();

        // Future date check
        if (birthDate > today) {
          setError("Date of birth cannot be in the future");
          setLoading(false);
          return;
        }

        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        // Adjust age if birthday hasn't occurred this year
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }

        if (age < 18) {
          setError("You must be at least 18 years old");
          setLoading(false);
          return;
        }
      }

      // Prepare payload and include file if provided
      const payload = {
        full_name: fullName,
        date_of_birth: dateOfBirth || null,
        college: college || null,
      };
      if (profilePicture instanceof File) {
        payload.profile_picture = profilePicture;
      }

      // Update profile via API
      const response = await authApi.updateProfile(payload);

      // Fetch fresh profile to ensure picture URL is correct
      let profileData;
      try {
        profileData = await authApi.getProfile();
      } catch (fetchErr) {
        console.warn("Failed to fetch profile after update", fetchErr);
        profileData = response.user || response;
      }

      dispatch({
        type: "UPDATE_PROFILE",
        payload: profileData.user || profileData,
      });

      // Ensure preview shows the saved image URL
      const savedUrl =
        (profileData.user || profileData)?.profile_picture || null;
      setProfilePicturePreview(savedUrl ? getMediaUrl(savedUrl) : null);

      setSuccess("Profile updated successfully!");
      setIsEditing(false);
      // Clear selected file after successful update
      setProfilePicture(null);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          err.response?.data?.full_name?.[0] ||
          "Failed to update profile",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-picture-section">
          <input
            type="file"
            id="profilePicture"
            accept="image/*"
            onChange={handleProfilePictureChange}
            hidden
            disabled={!isEditing || loading}
          />
          <label
            htmlFor="profilePicture"
            className={`profile-picture-label ${
              isEditing ? "clickable" : "readonly"
            }`}
          >
            <img
              src={
                profilePicturePreview ||
                (user?.profile_picture
                  ? getMediaUrl(user.profile_picture)
                  : null) ||
                "/default-profile.png"
              }
              alt={user?.full_name || "Profile"}
              className="profile-picture-circle"
            />
            {isEditing && <span className="avatar-overlay">Change</span>}
          </label>
        </div>

        <h1 className="profile-title">👤 My Profile</h1>

        {!isEditing ? (
          // View Mode
          <div className="profile-view">
            <div className="profile-field">
              <label className="profile-label">Email</label>
              <p className="profile-value">{user?.email}</p>
            </div>

            <div className="profile-field">
              <label className="profile-label">Full Name</label>
              <p className="profile-value">{user?.full_name}</p>
            </div>

            <div className="profile-field">
              <label className="profile-label">Date of Birth</label>
              <p className="profile-value">
                {user?.date_of_birth || "Not provided"}
              </p>
            </div>

            <div className="profile-field">
              <label className="profile-label">College</label>
              <p className="profile-value">{user?.college || "Not provided"}</p>
            </div>

            <button className="edit-button" onClick={() => setIsEditing(true)}>
              ✏️ Edit Profile
            </button>
          </div>
        ) : (
          // Edit Mode
          <form onSubmit={handleUpdate} className="profile-form">
            <div className="profile-field">
              <label className="profile-label">Email</label>
              <p className="profile-value">{user?.email}</p>
              <small>Email cannot be changed</small>
            </div>

            <div className="profile-field">
              <label htmlFor="fullName" className="profile-label">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                className="profile-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="profile-field">
              <label htmlFor="dateOfBirth" className="profile-label">
                Date of Birth
              </label>
              <input
                type="date"
                id="dateOfBirth"
                className="profile-input"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="profile-field">
              <label htmlFor="college" className="profile-label">
                College
              </label>
              <input
                type="text"
                id="college"
                className="profile-input"
                placeholder="Enter your college name"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Profile picture editing handled inline at the top image */}

            {error && <div className="profile-error">{error}</div>}
            {success && <div className="profile-success">{success}</div>}

            <div className="profile-buttons">
              <button type="submit" className="save-button" disabled={loading}>
                {loading ? "⏳ Saving..." : "💾 Save Changes"}
              </button>

              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setIsEditing(false);
                  // Reset form
                  setFullName(user?.full_name || "");
                  setDateOfBirth(user?.date_of_birth || "");
                  setCollege(user?.college || "");
                  setProfilePicture(null);
                  setProfilePicturePreview(
                    user?.profile_picture
                      ? getMediaUrl(user.profile_picture)
                      : null,
                  );
                  setError(null);
                }}
                disabled={loading}
              >
                ❌ Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;
