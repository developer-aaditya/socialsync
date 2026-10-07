import { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/stories.css';
import storyApi from '../api/storyApi';
import { useAuth } from '../hooks/useAuth';
import getMediaUrl from '../utils/mediaUrl';
import StoryViewersModal from './StoryViewersModal';

const STORY_DURATION_MS = 5000; // 5 seconds per story

const StoryViewerModal = ({
  userGroups = [],
  initialGroupIndex = 0,
  onClose,
  onMarkViewed,
}) => {
  const { user: currentUser } = useAuth();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isViewersOpen, setIsViewersOpen] = useState(false);

  const currentGroup = userGroups[groupIndex] || null;
  const currentStory = currentGroup?.stories?.[storyIndex] || null;

  const isOwner =
    currentStory &&
    (currentStory.user === currentUser?.id ||
      currentStory.username?.toLowerCase() === currentUser?.username?.toLowerCase());

  // Mark current story as viewed
  useEffect(() => {
    if (currentStory && !currentStory.has_viewed) {
      storyApi.markStoryViewed(currentStory.id).catch((err) => {
        console.error('Failed to mark story as viewed:', err);
      });
      if (onMarkViewed) onMarkViewed(currentStory.id);
    }
  }, [currentStory, onMarkViewed]);

  const goToNextStory = useCallback(() => {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (groupIndex < userGroups.length - 1) {
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentGroup, storyIndex, groupIndex, userGroups.length, onClose]);

  const goToPrevStory = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      const prevGroupIndex = groupIndex - 1;
      setGroupIndex(prevGroupIndex);
      const prevGroupStories = userGroups[prevGroupIndex]?.stories || [];
      setStoryIndex(Math.max(0, prevGroupStories.length - 1));
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [storyIndex, groupIndex, userGroups]);

  // Handle timer animation progress
  useEffect(() => {
    if (isPaused || isViewersOpen || !currentStory) return;

    const intervalTime = 50;
    const increment = (intervalTime / STORY_DURATION_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          goToNextStory();
          return 0;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPaused, isViewersOpen, currentStory, goToNextStory]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isViewersOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        goToNextStory();
      } else if (e.key === 'ArrowLeft') {
        goToPrevStory();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isViewersOpen, goToNextStory, goToPrevStory, onClose]);

  if (!currentGroup || !currentStory) return null;

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h`;
  };

  return (
    <div
      className="story-viewer-overlay"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="story-viewer-content" onClick={(e) => e.stopPropagation()}>
        {/* Top Progress Segmented Bars */}
        <div className="story-progress-container">
          {currentGroup.stories.map((s, idx) => {
            let barWidth = 0;
            if (idx < storyIndex) barWidth = 100;
            else if (idx === storyIndex) barWidth = progress;
            else barWidth = 0;

            return (
              <div key={s.id || idx} className="story-progress-track">
                <div
                  className="story-progress-fill"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Story Top Header */}
        <div className="story-viewer-header">
          <div className="story-header-author">
            <img
              src={
                currentGroup.profile_picture
                  ? getMediaUrl(currentGroup.profile_picture)
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      currentGroup.full_name || currentGroup.username
                    )}&background=6366f1&color=fff`
              }
              alt={currentGroup.username}
              className="story-header-avatar"
            />
            <div className="story-header-meta">
              <span className="story-header-name">@{currentGroup.username}</span>
              <span className="story-header-time">
                {formatTimeAgo(currentStory.created_at)}
              </span>
            </div>
          </div>

          <div className="story-header-right">
            <button
              className="story-viewer-close-btn"
              onClick={onClose}
              title="Close Story"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Story Image Container */}
        <div className="story-media-wrapper">
          <img
            src={getMediaUrl(currentStory.image)}
            alt={currentStory.caption || 'Story media'}
            className="story-full-img"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/600x900?text=Story+Image+Unavailable';
            }}
          />

          {/* Left / Right Click Nav Zones */}
          <div
            className="story-nav-zone zone-left"
            onClick={(e) => {
              e.stopPropagation();
              goToPrevStory();
            }}
            title="Previous Story"
          />
          <div
            className="story-nav-zone zone-right"
            onClick={(e) => {
              e.stopPropagation();
              goToNextStory();
            }}
            title="Next Story"
          />
        </div>

        {/* Story Caption Overlay */}
        {currentStory.caption && (
          <div className="story-caption-overlay">
            <p>{currentStory.caption}</p>
          </div>
        )}

        {/* Story Viewers Bar for Story Owner */}
        {isOwner && (
          <div className="story-owner-footer">
            <button
              className="story-viewers-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsPaused(true);
                setIsViewersOpen(true);
              }}
            >
              👁️ {currentStory.views_count || 0}{' '}
              {currentStory.views_count === 1 ? 'View' : 'Views'}
            </button>
          </div>
        )}
      </div>

      {/* Story Viewers Modal Drawer */}
      {isViewersOpen && (
        <StoryViewersModal
          storyId={currentStory.id}
          onClose={() => {
            setIsViewersOpen(false);
            setIsPaused(false);
          }}
        />
      )}
    </div>
  );
};

export default StoryViewerModal;
