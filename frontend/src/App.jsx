import { useState, useEffect } from 'react';
import './App.css';
import { useAuth } from './hooks/useAuth';
import { tokenService } from './utils/tokenService';
import Navbar from './components/Navbar';
import Loader from './components/Loader';
import ErrorAlert from './components/ErrorAlert';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import PostFeed from './pages/PostFeed';

function App() {
  // Get auth state from context
  const { isAuthenticated, loading, error: authError } = useAuth();

  // Page navigation state (login, signup, profile, posts)
  const [currentPage, setCurrentPage] = useState('login');
  const [globalError, setGlobalError] = useState(null);

  // Show global error if auth error occurs
  useEffect(() => {
    if (authError) {
      setGlobalError(authError);
    }
  }, [authError]);

  // Navigation without URL changes
  const navigateToPage = (page) => {
    setCurrentPage(page);
  };

  // Initialize page based on authentication status
  useEffect(() => {
    const hasToken = tokenService.hasToken();

    if (hasToken && isAuthenticated) {
      // If authenticated, default to posts
      setCurrentPage('posts');
    } else if (!hasToken) {
      // If not authenticated, show login
      setCurrentPage('login');
    }
  }, [isAuthenticated]);



  // Show loader while initializing
  if (loading) {
    return <Loader />;
  }

  return (
    <div className="app">
      {/* Global Error Alert */}
      <ErrorAlert 
        error={globalError} 
        onClose={() => setGlobalError(null)}
        autoClose={5000}
      />

      {/* Navbar (only shown when authenticated) */}
      {isAuthenticated && (
        <Navbar currentPage={currentPage} setCurrentPage={navigateToPage} />
      )}

      {/* Page Navigation - Conditional Rendering */}
      <main className="app-main">
        {!isAuthenticated ? (
          // Authentication Pages
          <>
            {currentPage === 'login' && (
              <Login setCurrentPage={navigateToPage} />
            )}
            {currentPage === 'signup' && (
              <Signup setCurrentPage={navigateToPage} />
            )}
          </>
        ) : (
          // Protected Pages (Only when authenticated)
          <>
            {currentPage === 'profile' && <Profile />}
            {currentPage === 'posts' && <PostFeed />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
