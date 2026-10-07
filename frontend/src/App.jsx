import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import './App.css';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Loader from './components/Loader';
import ErrorAlert from './components/ErrorAlert';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import PostFeed from './pages/PostFeed';
import UserProfilePage from './pages/UserProfilePage';
import SinglePostPage from './pages/SinglePostPage';
import PostDetailModal from './components/PostDetailModal';
import postApi from './api/postApi';

// Route Guard for Protected Pages
const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Route Guard for Auth Pages (Login / Signup)
const PublicOnlyRoute = ({ isAuthenticated, children }) => {
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Profile Route Component: renders own Profile if username matches current user
const ProfileRouteWrapper = ({ user, onNavigateToProfile }) => {
  const { username } = useParams();
  const isOwnProfile =
    !username ||
    (user?.username &&
      username.toLowerCase() === user.username.toLowerCase());

  if (isOwnProfile) {
    return <Profile onNavigateToProfile={onNavigateToProfile} />;
  }
  return <UserProfilePage onNavigateToProfile={onNavigateToProfile} />;
};

function App() {
  const { isAuthenticated, user, loading, error: authError } = useAuth();
  const navigate = useNavigate();

  const [globalError, setGlobalError] = useState(null);
  const [activeModalPost, setActiveModalPost] = useState(null);

  useEffect(() => {
    if (authError) {
      setGlobalError(authError);
    }
  }, [authError]);

  const navigateToUserProfile = (username) => {
    if (!username) return;
    if (user?.username && username.toLowerCase() === user.username.toLowerCase()) {
      navigate(`/${user.username}`);
    } else {
      navigate(`/${username}`);
    }
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
          onNavigateToProfile={navigateToUserProfile}
          onOpenPost={handleOpenPostById}
        />
      )}

      {/* Page Routing */}
      <main className="app-main">
        <Routes>
          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute isAuthenticated={isAuthenticated}>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnlyRoute isAuthenticated={isAuthenticated}>
                <Signup />
              </PublicOnlyRoute>
            }
          />

          {/* Protected Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <PostFeed onNavigateToProfile={navigateToUserProfile} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/post/:postId"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <SinglePostPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <ProfileRouteWrapper user={user} onNavigateToProfile={navigateToUserProfile} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/:username"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <ProfileRouteWrapper user={user} onNavigateToProfile={navigateToUserProfile} />
              </ProtectedRoute>
            }
          />

          {/* Catch-all Fallback */}
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
          />
        </Routes>
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
