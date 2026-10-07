import { useState, useEffect, useMemo } from 'react';
import '../styles/stories.css';
import storyApi from '../api/storyApi';
import { useAuth } from '../hooks/useAuth';
import getMediaUrl from '../utils/mediaUrl';
import StoryCreateModal from './StoryCreateModal';
import StoryViewerModal from './StoryViewerModal';

const StoriesBar = ({ onStoryUpdated }) => {
  const { user: currentUser } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeUserGroupIndex, setActiveUserGroupIndex] = useState(null);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await storyApi.getStories();
      const activeStories = data.stories || [];
      setStories(activeStories);
    } catch (err) {
      console.error('Failed to fetch stories:', err);
      setError('Could not load stories');
    } finally {
      setLoading(false);
    }
  };

  // Group active stories by user
  const groupedUserStories = useMemo(() => {
    const map = new Map();

    stories.forEach((story) => {
      const username = story.username || `user_${story.user}`;
      if (!map.has(username)) {
        map.set(username, {
          username: story.username,
          full_name: story.full_name || story.username,
          profile_picture: story.profile_picture,
          userId: story.user,
          stories: [],
          hasUnseen: false,
        });
      }
      const group = map.get(username);
      group.stories.push(story);
      if (!story.has_viewed) {
        group.hasUnseen = true;
      }
    });

    return Array.from(map.values());
  }, [stories]);

  // Check if current logged-in user has any active story
  const currentUserGroup = useMemo(() => {
    if (!currentUser?.username) return null;
    return groupedUserStories.find(
      (group) => group.username?.toLowerCase() === currentUser.username.toLowerCase()
    );
  }, [groupedUserStories, currentUser]);

  const handleStoryCreated = (newStory) => {
    fetchStories();
    if (onStoryUpdated) onStoryUpdated(newStory);
  };

  const handleStoryViewedState = (storyId) => {
    setStories((prevStories) =>
      prevStories.map((st) => (st.id === storyId ? { ...st, has_viewed: true } : st))
    );
  };

  const getAvatarUrl = (userObj) => {
    if (userObj?.profile_picture) {
      return getMediaUrl(userObj.profile_picture);
    }
    const name = encodeURIComponent(userObj?.full_name || userObj?.username || 'User');
    return `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff`;
  };

  return (
    <div className="stories-bar-wrapper">
      <div className="stories-container">
        {/* Your Story Button / Card */}
        <div className="story-item currentUser-story-item">
          <div
            className={`story-avatar-ring ${
              currentUserGroup ? (currentUserGroup.hasUnseen ? 'ring-unseen' : 'ring-seen') : 'ring-add'
            }`}
            onClick={() => {
              if (currentUserGroup) {
                // Open user's existing story
                const idx = groupedUserStories.findIndex(
                  (g) => g.username?.toLowerCase() === currentUser?.username?.toLowerCase()
                );
                if (idx !== -1) setActiveUserGroupIndex(idx);
              } else {
                setIsCreateModalOpen(true);
              }
            }}
          >
            <img
              src={
                currentUser?.profile_picture
                  ? getMediaUrl(currentUser.profile_picture)
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      currentUser?.full_name || 'Me'
                    )}&background=6366f1&color=fff`
              }
              alt="Your story"
              className="story-avatar-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  currentUser?.full_name || 'Me'
                )}&background=6366f1&color=fff`;
              }}
            />
            <button
              className="story-add-badge"
              title="Add new story"
              onClick={(e) => {
                e.stopPropagation();
                setIsCreateModalOpen(true);
              }}
            >
              +
            </button>
          </div>
          <span className="story-username">Your Story</span>
        </div>

        {/* Other Users' Stories */}
        {loading ? (
          <div className="stories-loading-skeletons">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="story-item skeleton-story-item">
                <div className="skeleton-avatar" />
                <div className="skeleton-line" />
              </div>
            ))}
          </div>
        ) : (
          groupedUserStories
            .filter((g) => g.username?.toLowerCase() !== currentUser?.username?.toLowerCase())
            .map((group, index) => {
              const actualIdx = groupedUserStories.findIndex((g) => g.username === group.username);
              return (
                <div
                  key={group.username}
                  className="story-item"
                  onClick={() => setActiveUserGroupIndex(actualIdx)}
                >
                  <div
                    className={`story-avatar-ring ${
                      group.hasUnseen ? 'ring-unseen' : 'ring-seen'
                    }`}
                  >
                    <img
                      src={getAvatarUrl(group)}
                      alt={group.full_name}
                      className="story-avatar-img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          group.full_name
                        )}&background=6366f1&color=fff`;
                      }}
                    />
                  </div>
                  <span className="story-username">{group.username}</span>
                </div>
              );
            })
        )}
      </div>

      {/* Story Creation Modal */}
      {isCreateModalOpen && (
        <StoryCreateModal
          onClose={() => setIsCreateModalOpen(false)}
          onStoryCreated={handleStoryCreated}
        />
      )}

      {/* Story Viewer Modal */}
      {activeUserGroupIndex !== null && (
        <StoryViewerModal
          userGroups={groupedUserStories}
          initialGroupIndex={activeUserGroupIndex}
          onClose={() => setActiveUserGroupIndex(null)}
          onMarkViewed={handleStoryViewedState}
          onOpenCreateStory={() => {
            setActiveUserGroupIndex(null);
            setIsCreateModalOpen(true);
          }}
        />
      )}
    </div>
  );
};

export default StoriesBar;
