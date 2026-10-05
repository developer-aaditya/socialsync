import "../styles/auth.css";
import authApi from "../api/authApi";
import { useState } from "react";
import { tokenService } from "../utils/tokenService";
import { useAuth } from "../hooks/useAuth";

const Signup = ({ setCurrentPage }) => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { dispatch } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const trimmedEmail = email.trim();
      const trimmedFullName = fullName.trim();
      const trimmedPassword = password.trim();
      const trimmedConfirmPassword = confirmPassword.trim();
      const trimmedDOB = dateOfBirth.trim();

      if (
        !trimmedEmail ||
        !trimmedFullName ||
        !trimmedPassword ||
        !trimmedConfirmPassword ||
        !trimmedDOB
      ) {
        setError("All fields are required");
        setLoading(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setError("Please enter a valid email address");
        setLoading(false);
        return;
      }

      const hasUpperCase = /[A-Z]/.test(trimmedPassword);
      const hasLowerCase = /[a-z]/.test(trimmedPassword);
      const hasNumber = /[0-9]/.test(trimmedPassword);
      const hasSpecial = /[!@#$%^&*]/.test(trimmedPassword);

      if (
        trimmedPassword.length < 8 ||
        !hasUpperCase ||
        !hasLowerCase ||
        !hasNumber ||
        !hasSpecial
      ) {
        setError(
          "Password must be 8+ characters with uppercase, lowercase, number and special character (!@#$%^&*)"
        );
        setLoading(false);
        return;
      }

      if (trimmedPassword !== trimmedConfirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      const birthDate = new Date(trimmedDOB);
      const today = new Date();

      if (birthDate > today) {
        setError("Date of birth cannot be in the future");
        setLoading(false);
        return;
      }

      let age = today.getFullYear() - birthDate.getFullYear();

      if (age < 18) {
        setError("You must be at least 18 years old to create an account");
        setLoading(false);
        return;
      }

      if (!profilePicture) {
        setError("Select a profile picture.");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("email", trimmedEmail);
      formData.append("password", trimmedPassword);
      formData.append("confirm_password", trimmedConfirmPassword);
      formData.append("full_name", trimmedFullName);
      formData.append("date_of_birth", trimmedDOB);
      if (profilePicture) {
        formData.append("profile_picture", profilePicture);
      }

      const response = await authApi.signup(formData);

      tokenService.setAccessToken(response.tokens.access);
      tokenService.setRefreshToken(response.tokens.refresh);

      let profileData;
      try {
        profileData = await authApi.getProfile();
      } catch (_) {
        profileData = response.user || response;
      }

      dispatch({
        type: "SIGNUP_SUCCESS",
        payload: profileData.user || profileData,
      });

      setCurrentPage("posts");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          err.response?.data?.email?.[0] ||
          "Signup failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }

      setProfilePicture(file);
      setError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">⚡ Join SocialSync</h1>
        <p className="auth-subtitle">Create your personal account</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="profile-avatar-wrapper">
            <input
              type="file"
              id="profilePicture"
              accept="image/*"
              onChange={handleProfilePictureChange}
              hidden
              disabled={loading}
            />
            <label htmlFor="profilePicture" className="profile-avatar">
              <img
                src={
                  profilePicturePreview
                    ? profilePicturePreview
                    : "https://ui-avatars.com/api/?name=User&background=6366f1&color=fff"
                }
                alt="Profile"
              />
              <span className="avatar-overlay">Upload</span>
            </label>
          </div>
          <div className="form-group">
            <label htmlFor="fullName" className="form-label">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              className="form-input"
              placeholder="e.g. Alex Morgan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="password-row">
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                className="form-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="dateOfBirth" className="form-label">
              Date of Birth
            </label>
            <input
              type="date"
              id="dateOfBirth"
              className="form-input"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "⏳ Creating Account..." : "Create Account ⚡"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <button
            type="button"
            className="switch-button"
            onClick={() => setCurrentPage("login")}
            disabled={loading}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default Signup;
