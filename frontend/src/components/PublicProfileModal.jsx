import { useState, useEffect } from 'react';
import '../styles/profile.css';
import userApi from '../api/userApi';
import { useAuth } from '../hooks/useAuth';
import getMediaUrl from '../utils/mediaUrl';
import PostCard from './PostCard';
import Loader from './Loader';
import FollowListModal from './FollowListModal';
import InstagramPostGrid from './InstagramPostGrid';

const PublicProfileModal = ({ username, onClose }) => {
  const { user: currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'feed'
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);

  const [followModalType, setFollowModalType] = useState(null); // 'followers' | 'following' | null
  const [selectedNestedUser, setSelectedNestedUser] = useState(null);

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
      console.error('Failed to fetch public profile:', err);
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

  if (!username) return null;

  const isSelf =
    currentUser?.username?.toLowerCase() === profileData?.username?.toLowerCase();

  return (
    <>
      <div className="public-profile-modal-overlay" onClick={onClose}>
        <div
          className="public-profile-modal-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="public-profile-header">
            <h3>👤 @{username}'s Profile</h3>
            <button className="profile-close-btn" onClick={onClose} title="Close">
              ✕
            </button>
          </div>

          {loading ? (
            <div className="public-profile-body profile-skeleton-body">
              <div className="public-user-card profile-skeleton-card">
                <div className="public-avatar-wrapper skeleton-avatar-circle shimmer"></div>
                <div className="public-user-info">
                  <div className="skeleton-line skeleton-title shimmer"></div>
                  <div className="skeleton-line skeleton-handle shimmer"></div>
                  <div className="skeleton-line skeleton-bio shimmer"></div>
                  <div className="public-stats-bar">
                    <div className="skeleton-line skeleton-stat shimmer"></div>
                    <div className="skeleton-line skeleton-stat shimmer"></div>
                    <div className="skeleton-line skeleton-stat shimmer"></div>
                  </div>
                </div>
              </div>
              <div className="profile-skeleton-grid">
                <div className="skeleton-grid-tile shimmer"></div>
                <div className="skeleton-grid-tile shimmer"></div>
                <div className="skeleton-grid-tile shimmer"></div>
                <div className="skeleton-grid-tile shimmer"></div>
                <div className="skeleton-grid-tile shimmer"></div>
                <div className="skeleton-grid-tile shimmer"></div>
              </div>
            </div>
          ) : error ? (
            <div className="profile-modal-error">⚠️ {error}</div>
          ) : profileData ? (
            <div className="public-profile-body">
              {/* Instagram Profile Header Card */}
              <div className="public-user-card">
                <div className="public-avatar-wrapper">
                  <img
                    src={
                      profileData.profile_picture
                        ? getMediaUrl(profileData.profile_picture)
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            profileData.full_name || profileData.username
                          )}&background=6366f1&color=fff`
                    }
                    alt={profileData.full_name}
                    className="public-avatar-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        profileData.username
                      )}&background=6366f1&color=fff`;
                    }}
                  />
                </div>

                <div className="public-user-info">
                  <div className="public-name-row">
                    <div>
                      <h2 className="public-fullname">
                        {profileData.full_name || profileData.username}
                      </h2>
                      <span className="public-handle">@{profileData.username}</span>
                    </div>

                    {!isSelf && (
                      <button
                        className={`btn-follow ${
                          profileData.is_following ? 'is-following' : ''
                        }`}
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
                    )}
                  </div>

                  {profileData.description && (
                    <p className="public-bio">{profileData.description}</p>
                  )}

                  {profileData.college && (
                    <div className="public-college-tag">
                      🎓 {profileData.college}
                    </div>
                  )}

                  {/* Follower Stats */}
                  <div className="public-stats-bar">
                    <div className="stat-box">
                      <span className="stat-number">{posts.length}</span>
                      <span className="stat-label">Posts</span>
                    </div>
                    <div
                      className="stat-box clickable"
                      onClick={() => setFollowModalType('followers')}
                      title="View Followers"
                    >
                      <span className="stat-number">
                        {profileData.followers_count || 0}
                      </span>
                      <span className="stat-label">Followers</span>
                    </div>
                    <div
                      className="stat-box clickable"
                      onClick={() => setFollowModalType('following')}
                      title="View Following"
                    >
                      <span className="stat-number">
                        {profileData.following_count || 0}
                      </span>
                      <span className="stat-label">Following</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instagram Layout View Switcher Tabs */}
              <div className="profile-view-tabs">
                <button
                  className={`view-tab-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  ▦ POSTS GRID
                </button>
                <button
                  className={`view-tab-btn ${viewMode === 'feed' ? 'active' : ''}`}
                  onClick={() => setViewMode('feed')}
                >
                  📜 STREAM FEED
                </button>
              </div>

              {/* Posts Grid vs Stream Feed View */}
              <div className="public-user-posts-section">
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
          ) : null}
        </div>
      </div>

      {/* Followers / Following List Modal */}
      {followModalType && (
        <FollowListModal
          username={profileData?.username || username}
          type={followModalType}
          onClose={() => setFollowModalType(null)}
          onSelectUser={(u) => {
            setFollowModalType(null);
            setSelectedNestedUser(u);
          }}
        />
      )}

      {/* Nested Public Profile Modal if a user was clicked inside FollowListModal */}
      {selectedNestedUser && (
        <PublicProfileModal
          username={selectedNestedUser}
          onClose={() => setSelectedNestedUser(null)}
        />
      )}
    </>
  );
};

export default PublicProfileModal;
