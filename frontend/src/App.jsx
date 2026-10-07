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
import UserProfilePage from './pages/UserProfilePage';
import PostDetailModal from './components/PostDetailModal';
import postApi from './api/postApi';

function App() {
  const { isAuthenticated, loading, error: authError } = useAuth();

  const [currentPage, setCurrentPage] = useState(() => tokenService.hasToken() ? 'posts' : 'login');
  const [viewingUsername, setViewingUsername] = useState(null);
  const [globalError, setGlobalError] = useState(null);
  const [activeModalPost, setActiveModalPost] = useState(null);

  useEffect(() => {
    if (authError) {
      setGlobalError(authError);
    }
  }, [authError]);

  const navigateToPage = (page) => {
    setCurrentPage(page);
    if (page !== 'user-profile') {
      setViewingUsername(null);
    }
  };

  const navigateToUserProfile = (username) => {
    if (!username) return;
    setViewingUsername(username);
    setCurrentPage('user-profile');
  };

  const handleOpenPostById = async (postId) => {
    if (!postId) return;
    try {
      const data = await postApi.getPost(postId);
      if (data) {
        setActiveModalPost(data);
      }
    } catch (err) {
      console.error('Failed to load notification post detail:', err);
      setGlobalError('Could not load the requested post.');
    }
  };

  useEffect(() => {
    const hasToken = tokenService.hasToken();

    if (hasToken && isAuthenticated) {
      if (currentPage === 'login' || currentPage === 'signup') {
        setCurrentPage('posts');
      }
    } else if (!hasToken) {
      setCurrentPage('login');
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="app-initial-loader">
        <Loader />
      </div>
    );
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
        <Navbar
          currentPage={currentPage}
          setCurrentPage={navigateToPage}
          onNavigateToProfile={navigateToUserProfile}
          onOpenPost={handleOpenPostById}
        />
      )}

      {/* Page Navigation - Conditional Rendering */}
      <main className="app-main">
        {!isAuthenticated ? (
          <>
            {currentPage === 'login' && (
              <Login setCurrentPage={navigateToPage} />
            )}
            {currentPage === 'signup' && (
              <Signup setCurrentPage={navigateToPage} />
            )}
          </>
        ) : (
          <>
            {currentPage === 'profile' && (
              <Profile onNavigateToProfile={navigateToUserProfile} />
            )}
            {currentPage === 'user-profile' && (
              <UserProfilePage
                username={viewingUsername}
                onNavigateToProfile={navigateToUserProfile}
                onNavigateBack={() => navigateToPage('posts')}
              />
            )}
            {currentPage === 'posts' && (
              <PostFeed onNavigateToProfile={navigateToUserProfile} />
            )}
          </>
        )}
      </main>

      {/* Notification Target Post Detail Lightbox Modal */}
      {activeModalPost && (
        <PostDetailModal
          post={activeModalPost}
          onClose={() => setActiveModalPost(null)}
          onNavigateToProfile={navigateToUserProfile}
        />
      )}
    </div>
  );
}

export default App;
