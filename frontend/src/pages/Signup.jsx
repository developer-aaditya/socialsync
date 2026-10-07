import "../styles/auth.css";
import authApi from "../api/authApi";
import userApi from "../api/userApi";
import { useState, useEffect, useRef } from "react";
import { tokenService } from "../utils/tokenService";
import { useAuth } from "../hooks/useAuth";
import themeService from "../utils/themeService";
import ImageCropperModal from "../components/ImageCropperModal";

const Signup = ({ setCurrentPage }) => {
  // Step 1: Account details (Mandatory)
  const [step, setStep] = useState(1); // 1 = Mandatory details, 2 = Optional Profile info

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  // Step 2: Profile info (Optional)
  const [description, setDescription] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);

  // Debounced Username State
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, reason: "" });
  const debounceTimerRef = useRef(null);

  // Cropper Modal State
  const [rawImageForCrop, setRawImageForCrop] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { dispatch } = useAuth();

  useEffect(() => {
    themeService.applyTheme(themeService.getStoredTheme());
    const cleanup = themeService.initSystemListener();
    return () => cleanup();
  }, []);

  // Debounced username availability check
  useEffect(() => {
    const handle = username.trim().toLowerCase();
    if (!handle) {
      setUsernameStatus({ checking: false, available: null, reason: "" });
      return;
    }

    if (handle.length < 3) {
      setUsernameStatus({ checking: false, available: false, reason: "Username must be at least 3 characters." });
      return;
    }

    if (/\s/.test(handle)) {
      setUsernameStatus({ checking: false, available: false, reason: "Username cannot contain spaces." });
      return;
    }

    if (!/^[a-zA-Z0-9._]+$/.test(handle)) {
      setUsernameStatus({ checking: false, available: false, reason: "Only letters, numbers, dots, and underscores allowed." });
      return;
    }

    setUsernameStatus({ checking: true, available: null, reason: "Checking availability..." });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await userApi.checkUsernameAvailability(handle);
        setUsernameStatus({ checking: false, available: res.available, reason: res.available ? "Username handle is available!" : "Username handle is already taken." });
      } catch (err) {
        setUsernameStatus({
          checking: false,
          available: false,
          reason: err.response?.data?.reason || "Username handle is already taken."
        });
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [username]);

  // Step 1 Validation & Proceed to Step 2
  const handleProceedToStep2 = (e) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedFullName = fullName.trim();
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();
    const trimmedDOB = dateOfBirth.trim();

    if (!trimmedFullName || !trimmedEmail || !trimmedUsername || !trimmedPassword || !trimmedConfirmPassword || !trimmedDOB) {
      setError("Please fill out all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (usernameStatus.available === false) {
      setError(usernameStatus.reason || "Please select an available username.");
      return;
    }

    const hasUpperCase = /[A-Z]/.test(trimmedPassword);
    const hasLowerCase = /[a-z]/.test(trimmedPassword);
    const hasNumber = /[0-9]/.test(trimmedPassword);
    const hasSpecial = /[!@#$%^&*]/.test(trimmedPassword);

    if (trimmedPassword.length < 8 || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
      setError("Password must be 8+ characters with uppercase, lowercase, number and special character (!@#$%^&*)");
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const birthDate = new Date(trimmedDOB);
    const today = new Date();

    if (birthDate > today) {
      setError("Date of birth cannot be in the future.");
      return;
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      setError("You must be at least 18 years old to create an account.");
      return;
    }

    // All Step 1 validations pass! Move to Step 2
    setStep(2);
  };

  // Image Selection for Cropping
  const handleSelectRawPicture = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file (JPG or PNG)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }
      setError(null);
      const url = URL.createObjectURL(file);
      setRawImageForCrop(url);
    }
  };

  // Crop Completed Callback
  const handleCropComplete = (croppedFile, croppedUrl) => {
    setProfilePicture(croppedFile);
    setProfilePicturePreview(croppedUrl);
    setRawImageForCrop(null);
  };

  // Final Form Submission (Step 2)
  const handleFinalSignup = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("email", email.trim());
      formData.append("username", username.trim().toLowerCase());
      formData.append("full_name", fullName.trim());
      formData.append("password", password.trim());
      formData.append("confirm_password", confirmPassword.trim());
      formData.append("date_of_birth", dateOfBirth.trim());

      if (description.trim()) {
        formData.append("description", description.trim());
      }

      if (profilePicture instanceof File) {
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
      console.error("Signup error:", err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          err.response?.data?.username?.[0] ||
          err.response?.data?.email?.[0] ||
          "Signup failed. Please check your information."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header-row">
          <h1 className="auth-title">⚡ Join SocialSync</h1>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="signup-stepper-bar">
          <div className={`stepper-step ${step === 1 ? 'active' : 'completed'}`}>
            <span className="step-num">1</span>
            <span className="step-label">Account Info</span>
          </div>
          <div className="stepper-line"></div>
          <div className={`stepper-step ${step === 2 ? 'active' : ''}`}>
            <span className="step-num">2</span>
            <span className="step-label">Profile Info (Optional)</span>
          </div>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}

        {/* STEP 1: MANDATORY ACCOUNT DETAILS */}
        {step === 1 && (
          <form onSubmit={handleProceedToStep2} className="auth-form">
            <p className="auth-subtitle" style={{ marginBottom: '16px' }}>
              Enter your basic account details below
            </p>

            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="fullName" className="form-label">
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                className="form-input"
                placeholder="e.g. Alex Morgan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Username with Live Debounce Check */}
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Username Handle *
              </label>
              <div className="input-with-badge">
                <input
                  type="text"
                  id="username"
                  className={`form-input ${
                    usernameStatus.available === true
                      ? 'input-valid'
                      : usernameStatus.available === false
                      ? 'input-invalid'
                      : ''
                  }`}
                  placeholder="e.g. alex_morgan"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  required
                />
              </div>
              {username.trim().length > 0 && (
                <div className={`username-status-msg ${usernameStatus.available === true ? 'status-success' : usernameStatus.available === false ? 'status-error' : 'status-checking'}`}>
                  {usernameStatus.checking ? '⚡ Checking availability...' : usernameStatus.reason}
                </div>
              )}
            </div>

            {/* Date of Birth */}
            <div className="form-group">
              <label htmlFor="dateOfBirth" className="form-label">
                Date of Birth * (Must be 18+)
              </label>
              <input
                type="date"
                id="dateOfBirth"
                className="form-input"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
              />
            </div>

            {/* Password & Confirm Password */}
            <div className="password-row">
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password *
                </label>
                <input
                  type="password"
                  id="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="form-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-button" style={{ marginTop: '12px' }}>
              Continue to Profile ➔
            </button>
          </form>
        )}

        {/* STEP 2: OPTIONAL PROFILE INFO & 1:1 BOX CROPPER */}
        {step === 2 && (
          <form onSubmit={handleFinalSignup} className="auth-form">
            <p className="auth-subtitle" style={{ marginBottom: '16px' }}>
              Set up your profile picture & description (Optional)
            </p>

            {/* Profile Picture Upload & Cropper Trigger */}
            <div className="profile-avatar-wrapper" style={{ flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <input
                type="file"
                id="profilePicture"
                accept="image/*"
                onChange={handleSelectRawPicture}
                hidden
                disabled={loading}
              />
              <label htmlFor="profilePicture" className="profile-avatar" title="Click to upload & crop picture">
                <img
                  src={
                    profilePicturePreview
                      ? profilePicturePreview
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=6366f1&color=fff`
                  }
                  alt="Profile"
                />
                <span className="avatar-overlay">📷 Crop 1:1</span>
              </label>
              <span className="form-hint">Click avatar to select & crop photo in 1:1 box</span>
            </div>

            {/* Description Textarea (Optional) */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="description" className="form-label">
                  Description (Optional)
                </label>
                <span className="char-count">{description.length}/500</span>
              </div>
              <textarea
                id="description"
                className="form-input"
                style={{ resize: 'vertical', minHeight: '80px' }}
                rows={3}
                maxLength={500}
                placeholder="Write a brief description about yourself..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                className="auth-button-secondary"
                onClick={() => setStep(1)}
                disabled={loading}
                style={{ flex: 1 }}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="auth-button"
                disabled={loading}
                style={{ flex: 2 }}
              >
                {loading ? "⏳ Creating Account..." : "Complete Signup ⚡"}
              </button>
            </div>
          </form>
        )}

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

export default Signup;
