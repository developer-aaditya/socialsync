import { tokenService } from '../utils/tokenService';

// Auth reducer actions
export const INITIAL_STATE = {
  user: null,
  isAuthenticated: false,
  loading: tokenService.hasToken(),
  error: null,
};

export const authReducer = (state, action) => {
  switch (action.type) {
    // Start loading
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    // Login successful
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null,
      };

    // Signup successful
    case 'SIGNUP_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null,
      };

    // Update profile
    case 'UPDATE_PROFILE':
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
        error: null,
      };

    // Fetch profile
    case 'FETCH_PROFILE':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null,
      };

    // Authentication error
    case 'AUTH_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    // Logout
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        error: null,
      };

    // Clear error
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};
