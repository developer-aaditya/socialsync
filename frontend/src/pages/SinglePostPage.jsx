import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import postApi from '../api/postApi';
import PostDetailModal from '../components/PostDetailModal';
import Loader from '../components/Loader';

const SinglePostPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (postId) {
      fetchSinglePost(postId);
    }
  }, [postId]);

  const fetchSinglePost = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const data = await postApi.getPost(id);
      if (data) {
        setPost(data);
      } else {
        setError('Post not found.');
      }
    } catch (err) {
      console.error('Failed to load post:', err);
      setError(err.response?.data?.detail || 'Could not load requested post.');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToProfile = (username) => {
    if (username) {
      navigate(`/${username}`);
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="app-initial-loader">
        <Loader />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="profile-page-container">
        <div className="profile-page-error">
          <h3>⚠️ Post Not Found</h3>
          <p>{error || 'The requested post does not exist or has been removed.'}</p>
          <button className="btn-secondary" onClick={handleClose} style={{ marginTop: '14px' }}>
            ← Back to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <PostDetailModal
      post={post}
      onClose={handleClose}
      onPostUpdated={() => fetchSinglePost(postId)}
      onNavigateToProfile={handleNavigateToProfile}
    />
  );
};

export default SinglePostPage;
