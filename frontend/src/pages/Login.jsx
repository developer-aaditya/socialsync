import { useState } from 'react';
import '../styles/auth.css';
import authApi from '../api/authApi';
import { tokenService } from '../utils/tokenService';
import { useAuth } from '../hooks/useAuth';

const Login = ({ setCurrentPage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { dispatch } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!email || !password) {
        setError('Email and password are required');
        setLoading(false);
        return;
      }

      const response = await authApi.login(email, password);
      const accessToken = response?.tokens?.access || response?.access;
      const refreshToken = response?.tokens?.refresh || response?.refresh;

      if (!accessToken || !refreshToken) {
        throw new Error('Missing tokens from server response. Please try again.');
      }

      tokenService.setAccessToken(accessToken);
      tokenService.setRefreshToken(refreshToken);

      let profileData;
      try {
        profileData = await authApi.getProfile();
      } catch (_) {
        profileData = response.user || response;
      }

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: profileData.user || profileData,
      });

      setCurrentPage('posts');
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          err.response?.data?.non_field_errors?.[0] ||
          err.message ||
          'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">⚡ SocialSync</h1>
        <p className="auth-subtitle">Sign in to sync with your network</p>

        <form onSubmit={handleSubmit} className="auth-form">
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

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? '⏳ Authenticating...' : 'Sign In 🔓'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <button
            type="button"
            className="switch-button"
            onClick={() => setCurrentPage('signup')}
            disabled={loading}
          >
            Create account
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
