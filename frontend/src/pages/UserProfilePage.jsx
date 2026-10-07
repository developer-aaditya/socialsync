import { useState, useEffect } from 'react';
import '../styles/profile.css';
import userApi from '../api/userApi';
import { useAuth } from '../hooks/useAuth';
import getMediaUrl from '../utils/mediaUrl';
import Loader from '../components/Loader';
import FollowListModal from '../components/FollowListModal';
import InstagramPostGrid from '../components/InstagramPostGrid';
import PostCard from '../components/PostCard';

const UserProfilePage = ({ username, onNavigateToProfile, onNavigateBack }) => {
  const { user: currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'feed'
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);

  const [followModalType, setFollowModalType] = useState(null); // 'followers' | 'following' | null

  useEffect(() => {
    if (username) {
      fetchUserProfile(username);
    }
  }, [username]);

  const fetchUserProfile = async (uname) => {
    try {
      setLoading(true);
      setError(null);
      const data = await userApi.getUserProfile(uname);
      setProfileData(data.user);
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setError(err.response?.data?.detail || 'Could not load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!profileData || followLoading) return;
    try {
      setFollowLoading(true);
      const res = await userApi.toggleFollow(profileData.username);
      setProfileData((prev) => ({
        ...prev,
        is_following: res.is_following,
        followers_count: res.followers_count,
      }));
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const isSelf =
    currentUser?.username?.toLowerCase() === profileData?.username?.toLowerCase();

  if (loading) {
    return (
      <div className="profile-page-container">
        <div className="profile-page-content">
          <header className="insta-profile-header">
            <div className="insta-avatar-col">
              <div className="insta-avatar-circle-wrapper skeleton-avatar-circle shimmer"></div>
            </div>
            <div className="insta-details-col">
              <div className="skeleton-line skeleton-title shimmer"></div>
              <div className="skeleton-line skeleton-handle shimmer"></div>
              <div className="skeleton-line skeleton-bio shimmer"></div>
              <div className="insta-stats-row">
                <div className="skeleton-line skeleton-stat shimmer"></div>
                <div className="skeleton-line skeleton-stat shimmer"></div>
                <div className="skeleton-line skeleton-stat shimmer"></div>
              </div>
            </div>
          </header>
          <div className="profile-skeleton-grid" style={{ marginTop: '24px' }}>
            <div className="skeleton-grid-tile shimmer"></div>
            <div className="skeleton-grid-tile shimmer"></div>
            <div className="skeleton-grid-tile shimmer"></div>
            <div className="skeleton-grid-tile shimmer"></div>
            <div className="skeleton-grid-tile shimmer"></div>
            <div className="skeleton-grid-tile shimmer"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="profile-page-container">
        <div className="profile-page-error">
          <h3>⚠️ User Profile Not Found</h3>
          <p>{error || 'The requested user profile does not exist.'}</p>
          {onNavigateBack && (
            <button className="btn-secondary" onClick={onNavigateBack}>
              ← Back to Feed
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-container">
      <div className="profile-page-content">
        {/* Instagram Profile Header */}
        <header className="insta-profile-header">
          {/* Avatar Column */}
          <div className="insta-avatar-col">
            <div className="insta-avatar-circle-wrapper">
              <img
                src={
                  profileData.profile_picture
                    ? getMediaUrl(profileData.profile_picture)
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        profileData.full_name || profileData.username
                      )}&background=6366f1&color=fff`
                }
                alt={profileData.full_name}
                className="insta-avatar-img"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    profileData.username
                  )}&background=6366f1&color=fff`;
                }}
              />
            </div>
          </div>

          {/* Details Column */}
          <div className="insta-details-col">
            {/* Top Row: Username & Follow Button */}
            <div className="insta-top-row">
              <h2 className="insta-username-handle">@{profileData.username}</h2>
              {!isSelf ? (
                <button
                  className={`btn-follow ${profileData.is_following ? 'is-following' : ''}`}
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                >
                  {followLoading
                    ? 'Updating...'
                    : profileData.is_following
                    ? '✓ Following'
                    : profileData.is_following_back
                    ? '+ Follow Back'
                    : '+ Follow'}
                </button>
              ) : (
                <span className="own-profile-badge">Your Profile</span>
              )}
            </div>

            {/* Middle Row: Instagram Stats Alignment */}
            <div className="insta-stats-row">
              <div className="insta-stat-item">
                <span className="stat-number">{posts.length}</span>
                <span className="stat-label">posts</span>
              </div>
              <div
                className="insta-stat-item clickable"
                onClick={() => setFollowModalType('followers')}
                title="View Followers"
              >
                <span className="stat-number">{profileData.followers_count || 0}</span>
                <span className="stat-label">followers</span>
              </div>
              <div
                className="insta-stat-item clickable"
                onClick={() => setFollowModalType('following')}
                title="View Following"
              >
                <span className="stat-number">{profileData.following_count || 0}</span>
                <span className="stat-label">following</span>
              </div>
            </div>

            {/* Bottom Row: Full Name, Bio & College */}
            <div className="insta-bio-section">
              <h3 className="insta-fullname">{profileData.full_name}</h3>
              {profileData.description && (
                <p className="insta-bio-text">{profileData.description}</p>
              )}
              {profileData.college && (
                <div className="public-college-tag">
                  🎓 {profileData.college}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Instagram View Switcher Tabs */}
        <div className="profile-view-tabs">
          <button
            className={`view-tab-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            ▦ POSTS
          </button>
          <button
            className={`view-tab-btn ${viewMode === 'feed' ? 'active' : ''}`}
            onClick={() => setViewMode('feed')}
          >
            📜 FEED STREAM
          </button>
        </div>

        {/* Posts Section */}
        <div className="profile-posts-display">
          {viewMode === 'grid' ? (
            <InstagramPostGrid
              posts={posts}
              onPostUpdated={() => fetchUserProfile(username)}
            />
          ) : posts.length > 0 ? (
            <div className="public-posts-list">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPostDeleted={() => fetchUserProfile(username)}
                  onPostUpdated={() => fetchUserProfile(username)}
                  activeCommentPostId={activeCommentPostId}
                  setActiveCommentPostId={setActiveCommentPostId}
                />
              ))}
            </div>
          ) : (
            <div className="public-no-posts">
              <span>📭</span>
              <p>No posts published yet by @{profileData.username}.</p>
            </div>
          )}
        </div>
      </div>

      {/* Followers / Following List Modal */}
      {followModalType && (
        <FollowListModal
          username={profileData.username}
          type={followModalType}
          onClose={() => setFollowModalType(null)}
          onSelectUser={(targetUser) => {
            setFollowModalType(null);
            if (onNavigateToProfile) onNavigateToProfile(targetUser);
          }}
        />
      )}
    </div>
  );
};

export default UserProfilePage;
