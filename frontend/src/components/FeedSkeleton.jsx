import React from 'react';
import '../styles/post.css';

export const FeedSkeleton = ({ count = 2 }) => {
  return (
    <div className="feed-skeleton-list">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="post-skeleton-card">
          {/* Header Skeleton */}
          <div className="skeleton-header">
            <div className="skeleton-avatar skeleton"></div>
            <div className="skeleton-meta">
              <div className="skeleton-line skeleton-title skeleton"></div>
              <div className="skeleton-line skeleton-subtitle skeleton"></div>
            </div>
          </div>
          {/* Text Content Skeleton */}
          <div className="skeleton-content">
            <div className="skeleton-line skeleton-text skeleton"></div>
            <div className="skeleton-line skeleton-text-short skeleton"></div>
          </div>
          {/* Image Media Box Skeleton */}
          <div className="skeleton-media skeleton"></div>
        </div>
      ))}
    </div>
  );
};

export const GridSkeleton = ({ count = 6 }) => {
  return (
    <div className="insta-grid-container">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="insta-grid-tile skeleton" style={{ minHeight: '180px' }}></div>
      ))}
    </div>
  );
};

export default FeedSkeleton;
