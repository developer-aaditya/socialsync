import { useState, useEffect } from "react";
import getMediaUrl from "../utils/mediaUrl";
import "../styles/profile.css";
import { useAuth } from "../hooks/useAuth";
import userApi from "../api/userApi";
import postApi from "../api/postApi";
import FollowListModal from "../components/FollowListModal";
import EditProfileModal from "../components/EditProfileModal";
import InstagramPostGrid from "../components/InstagramPostGrid";
import PostCard from "../components/PostCard";
import { FeedSkeleton, GridSkeleton } from "../components/FeedSkeleton";

const Profile = ({ onNavigateToProfile }) => {
  const { user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "feed"
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);

  const [stats, setStats] = useState({ followers_count: 0, following_count: 0 });
  const [followModalType, setFollowModalType] = useState(null);
  const [copiedProfile, setCopiedProfile] = useState(false);

  const handleShareProfile = () => {
    const shareUrl = `${window.location.origin}/profile/${user?.username}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedProfile(true);
        setTimeout(() => setCopiedProfile(false), 2000);
      }).catch(() => {
        fallbackCopyProfile(shareUrl);
      });
    } else {
      fallbackCopyProfile(shareUrl);
    }
  };

  const fallbackCopyProfile = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    setCopiedProfile(true);
    setTimeout(() => setCopiedProfile(false), 2000);
  };

  // Fetch logged-in user profile details & user posts
  useEffect(() => {
    if (user?.username) {
      fetchUserPosts();
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      const res = await userApi.getUserProfile(user.username);
      if (res?.user) {
        setStats({
          followers_count: res.user.followers_count || 0,
          following_count: res.user.following_count || 0,
        });
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchUserPosts = async () => {
    try {
      setPostsLoading(true);
      const data = await postApi.getAllPosts("latest");
      let allPosts = [];
      if (data?.results) allPosts = data.results;
      else if (data?.posts) allPosts = data.posts;
      else if (Array.isArray(data)) allPosts = data;

      // Filter posts that belong to the current logged-in user
      const ownPosts = allPosts.filter(
        (p) =>
          p.user_email === user?.email ||
          p.user_username?.toLowerCase() === user?.username?.toLowerCase(),
      );
      setUserPosts(ownPosts);
    } catch (err) {
      console.error("Failed to fetch user posts:", err);
    } finally {
      setPostsLoading(false);
    }
  };

  return (
    <div className="profile-page-container">
      <div className="profile-page-content">
        {/* Instagram Profile Header */}
        <header className="insta-profile-header">
          {/* Avatar Column */}
          <div className="insta-avatar-col">
            <div className="insta-avatar-circle-wrapper" onClick={() => setIsEditModalOpen(true)} style={{ cursor: "pointer" }} title="Click to edit profile">
              <img
                src={
                  user?.profile_picture
                    ? getMediaUrl(user.profile_picture)
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user?.full_name || user?.username || "User"
                      )}&background=6366f1&color=fff`
                }
                alt={user?.full_name || "Profile"}
                className="insta-avatar-img"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user?.username || "User"
                  )}&background=6366f1&color=fff`;
                }}
              />
            </div>
          </div>

          {/* Details Column */}
          <div className="insta-details-col">
            {/* Top Row: Username & Edit/Share Buttons */}
            <div className="insta-top-row">
              <h2 className="insta-username-handle">@{user?.username}</h2>
              <button
                className="btn-follow is-following"
                onClick={() => setIsEditModalOpen(true)}
              >
                ✏️ Edit Profile
              </button>
              <button
                className="btn-follow is-following"
                onClick={handleShareProfile}
                title="Share Profile Link"
              >
                🔗 {copiedProfile ? 'Copied! 📋' : 'Share Profile'}
              </button>
            </div>

            {/* Middle Row: Instagram Stats Alignment */}
            <div className="insta-stats-row">
              <div className="insta-stat-item">
                <span className="stat-number">{userPosts.length}</span>
                <span className="stat-label">posts</span>
              </div>
              <div
                className="insta-stat-item clickable"
                onClick={() => setFollowModalType("followers")}
                title="View Followers"
              >
                <span className="stat-number">{stats.followers_count}</span>
                <span className="stat-label">followers</span>
              </div>
              <div
                className="insta-stat-item clickable"
                onClick={() => setFollowModalType("following")}
                title="View Following"
              >
                <span className="stat-number">{stats.following_count}</span>
                <span className="stat-label">following</span>
              </div>
            </div>

            {/* Bottom Row: Full Name, Description & College */}
            <div className="insta-bio-section">
              <h3 className="insta-fullname">{user?.full_name}</h3>
              {user?.description && (
                <p className="insta-bio-text">{user.description}</p>
              )}
              {user?.college && (
                <div className="public-college-tag" style={{ marginTop: "4px" }}>
                  🎓 {user.college}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Instagram View Switcher Tabs (Grid vs Feed) */}
        <div className="profile-view-tabs">
          <button
            className={`view-tab-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            ▦ POSTS
          </button>
          <button
            className={`view-tab-btn ${viewMode === "feed" ? "active" : ""}`}
            onClick={() => setViewMode("feed")}
          >
            📜 FEED STREAM
          </button>
        </div>

        {/* Instagram Posts Display */}
        <div className="profile-posts-display">
          {postsLoading ? (
            viewMode === "grid" ? <GridSkeleton count={6} /> : <FeedSkeleton count={2} />
          ) : viewMode === "grid" ? (
            <InstagramPostGrid
              posts={userPosts}
              onPostUpdated={fetchUserPosts}
            />
          ) : userPosts.length > 0 ? (
            <div className="public-posts-list">
              {userPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPostDeleted={fetchUserPosts}
                  onPostUpdated={fetchUserPosts}
                  activeCommentPostId={activeCommentPostId}
                  setActiveCommentPostId={setActiveCommentPostId}
                />
              ))}
            </div>
          ) : (
            <div className="public-no-posts">
              <span>📭</span>
              <p>You haven't published any posts yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal Popup */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onProfileUpdated={() => {
          fetchUserPosts();
          fetchUserStats();
        }}
      />

      {/* Followers / Following List Modal */}
      {followModalType && user?.username && (
        <FollowListModal
          username={user.username}
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

export default Profile;
