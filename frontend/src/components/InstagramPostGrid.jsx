import { useState } from 'react';
import '../styles/instagram-grid.css';
import getMediaUrl from '../utils/mediaUrl';
import PostDetailModal from './PostDetailModal';

const InstagramPostGrid = ({ posts = [], onPostUpdated }) => {
  const [selectedPost, setSelectedPost] = useState(null);

  if (!posts || posts.length === 0) {
    return (
      <div className="insta-grid-empty">
        <span className="empty-icon">📷</span>
        <h3>No Posts Yet</h3>
        <p>When posts are published, they will appear here in a photo grid.</p>
      </div>
    );
  }

  return (
    <>
      <div className="insta-grid-container">
        {posts.map((post) => (
          <div
            key={post.id}
            className="insta-grid-tile"
            onClick={() => setSelectedPost(post)}
          >
            {post.image ? (
              <img
                src={getMediaUrl(post.image)}
                alt={post.description || 'Post thumbnail'}
                className="insta-tile-img"
              />
            ) : (
              <div className="insta-tile-text">
                <span className="tile-quote-icon">“</span>
                <span className="tile-text-snippet">
                  {post.description?.length > 70
                    ? `${post.description.substring(0, 70)}...`
                    : post.description}
                </span>
              </div>
            )}

            {/* Instagram Hover Overlay (Likes & Comments Stats) */}
            <div className="insta-tile-overlay">
              <div className="overlay-stat">
                <span>❤️</span>
                <strong>{post.likes_count || 0}</strong>
              </div>
              <div className="overlay-stat">
                <span>👎</span>
                <strong>{post.dislikes_count || 0}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full View Lightbox Modal when any tile is clicked */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onPostUpdated={() => {
            if (onPostUpdated) onPostUpdated();
          }}
        />
      )}
    </>
  );
};

export default InstagramPostGrid;
