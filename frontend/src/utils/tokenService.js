// Token Service - Manage JWT tokens in localStorage
export const tokenService = {
  // Store access token
  setAccessToken: (token) => {
    localStorage.setItem('access_token', token);
  },

  // Get access token
  getAccessToken: () => {
    return localStorage.getItem('access_token');
  },

  // Store refresh token
  setRefreshToken: (token) => {
    localStorage.setItem('refresh_token', token);
  },

  // Get refresh token
  getRefreshToken: () => {
    return localStorage.getItem('refresh_token');
  },

  // Clear all tokens
  clearTokens: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  // Check if user has valid token
  hasToken: () => {
    return !!localStorage.getItem('access_token');
  },
};
