import { createContext, useReducer, useEffect } from 'react';
import { authReducer, INITIAL_STATE } from './authReducer';
import { tokenService } from '../utils/tokenService';
import authApi from '../api/authApi';

// Create Auth Context
export const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, INITIAL_STATE);

  // Check if user is already logged in on app load
  useEffect(() => {
    const restoreAuth = async () => {
      const token = tokenService.getAccessToken();
      if(!token){
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      try {
        // Restore Login state
        const profileData = await authApi.getProfile();
        
        dispatch({
          type: 'FETCH_PROFILE',
          payload: profileData.user || profileData,
        });
      } catch (error) {
        tokenService.clearTokens();
        dispatch({ type: 'LOGOUT'})
      }
    }
    restoreAuth();
  }, []);

  // Force logout when the refresh token is invalid/expired
  useEffect(() => {
    const handleForceLogout = () => {
      dispatch({ type: 'LOGOUT' });
    };

    window.addEventListener('FORCE_LOGOUT', handleForceLogout);
    return () => {
      window.removeEventListener('FORCE_LOGOUT', handleForceLogout);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        dispatch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
