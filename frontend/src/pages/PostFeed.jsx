import { useState, useEffect, useRef, useCallback } from "react";
import "../styles/post.css";
import postApi from "../api/postApi";
import { useAuth } from "../hooks/useAuth";
import PostForm from "../components/PostForm";
import PostCard from "../components/PostCard";
import FeedSkeleton from "../components/FeedSkeleton";
import getMediaUrl from "../utils/mediaUrl";
import StoriesBar from "../components/StoriesBar";

const PostFeed = ({ onNavigateToProfile }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [feedType, setFeedType] = useState('for_you'); // 'for_you' | 'latest'
  const [nextCursorUrl, setNextCursorUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);

  const sentinelRef = useRef(null);

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    return age;
  };

  useEffect(() => {
    fetchPosts(feedType);
  }, [user, feedType]);

  const fetchPosts = async (type = feedType, showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    setError(null);
    try {
      const response = await postApi.getAllPosts(type);
      let postsArray = [];
      let nextUrl = null;

      if (response?.results && Array.isArray(response.results)) {
        postsArray = response.results;
        nextUrl = response.next;
      } else if (response?.posts && Array.isArray(response.posts)) {
        postsArray = response.posts;
        nextUrl = response.next || null;
      } else if (Array.isArray(response)) {
        postsArray = response;
      }

      setPosts(postsArray);
      setNextCursorUrl(nextUrl);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          "Failed to fetch feed posts"
      );
    } finally {
      if (showSkeleton) setLoading(false);
    }
  };

  const handlePostCreated = (newPost) => {
    if (newPost && newPost.id) {
      setPosts((prev) => [newPost, ...prev]);
    } else {
      fetchPosts(feedType);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursorUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await postApi.getAllPosts(feedType, nextCursorUrl);
      let newPosts = [];
      let nextUrl = null;

      if (response?.results) {
        newPosts = response.results;
        nextUrl = response.next;
      } else if (response?.posts) {
        newPosts = response.posts;
        nextUrl = response.next;
      }

      setPosts((prev) => [...prev, ...newPosts]);
      setNextCursorUrl(nextUrl);
    } catch (err) {
      console.error("Error loading next cursor page:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Instagram-style Automatic Infinite Scroll Observer
  const handleObserver = useCallback(
    (entries) => {
      const target = entries[0];
      if (target.isIntersecting && nextCursorUrl && !loadingMore && !loading) {
        handleLoadMore();
      }
    },
    [nextCursorUrl, loadingMore, loading]
  );

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "250px", // Trigger 250px before reaching bottom for seamless scroll
      threshold: 0,
    };
    const observer = new IntersectionObserver(handleObserver, options);
    const currentSentinel = sentinelRef.current;

    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [handleObserver]);

  return (
    <div className="modern-feed-container">
      <div className="feed-layout">
        {/* Sidebar - Profile & Stats Card */}
        <aside className="feed-sidebar">
          <div
            className="glass-sidebar-card"
            onClick={() => onNavigateToProfile && user?.username && onNavigateToProfile(user.username)}
            style={{ cursor: 'pointer' }}
            title="View Your Profile"
          >
            <div className="sidebar-avatar-wrapper">
              <img
                src={
                  user?.profile_picture
                    ? getMediaUrl(user.profile_picture)
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=6366f1&color=fff`
                }
                alt={user?.full_name}
                className="sidebar-avatar"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(user?.full_name || "User") + "&background=6366f1&color=fff";
                }}
              />
            </div>
            <h3 className="sidebar-user-name">{user?.full_name}</h3>
            <p className="sidebar-user-handle">@{user?.username}</p>

            {user?.description && (
              <p className="sidebar-user-bio">{user.description}</p>
            )}

            {user?.college && (
              <div className="sidebar-college-badge">
                🎓 {user.college}
              </div>
            )}

            <div className="sidebar-meta-list">
              {user?.date_of_birth && (
                <div className="meta-pill">
                  🎂 Age {calculateAge(user.date_of_birth)}
                </div>
              )}
              <div className="meta-pill">
                📅 Joined {new Date(user?.date_joined || Date.now()).toLocaleDateString()}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Feed Content Area */}
        <main className="feed-main-content">
          {/* 24-Hour Ephemeral Stories Bar */}
          <StoriesBar />

          {/* Post Form */}
          <PostForm onPostCreated={handlePostCreated} />

          {/* Feed Switcher Tabs */}
          <div className="feed-type-tabs">
            <button
              className={`feed-tab-btn ${feedType === 'for_you' ? 'active' : ''}`}
              onClick={() => setFeedType('for_you')}
            >
              🔥 For You
            </button>
            <button
              className={`feed-tab-btn ${feedType === 'latest' ? 'active' : ''}`}
              onClick={() => setFeedType('latest')}
            >
              ⏱️ Latest
            </button>
          </div>

          {/* Error Banner */}
          {error && <div className="feed-error-banner">⚠️ {error}</div>}

          {/* Feed List */}
          {loading ? (
            <FeedSkeleton count={2} />
          ) : (
            <div className="feed-posts-list">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPostDeleted={() => fetchPosts(feedType)}
                    onPostUpdated={() => fetchPosts(feedType)}
                    onNavigateToProfile={onNavigateToProfile}
                    activeCommentPostId={activeCommentPostId}
                    setActiveCommentPostId={setActiveCommentPostId}
                  />
                ))
              ) : (
                <div className="empty-feed-card">
                  <div className="empty-feed-icon">📭</div>
                  <h3>No posts in feed yet</h3>
                  <p>Be the first to publish a post!</p>
                </div>
              )}

              {/* Automatic Infinite Scroll Sentinel */}
              {nextCursorUrl && (
                <div ref={sentinelRef} className="infinite-scroll-sentinel">
                  {loadingMore && (
                    <div className="infinite-scroll-loader">
                      <span>⚡ Loading more posts...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PostFeed;
