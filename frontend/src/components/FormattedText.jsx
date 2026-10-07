import { useState } from 'react';
import PublicProfileModal from './PublicProfileModal';
import '../styles/post.css';

const FormattedText = ({ text, onNavigateToProfile, className = '' }) => {
  const [selectedUser, setSelectedUser] = useState(null);

  if (!text) return null;

  // Split text by @username pattern
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);

  const handleMentionClick = (mentionText, e) => {
    e.stopPropagation();
    const cleanUsername = mentionText.replace(/^@/, '');
    if (onNavigateToProfile) {
      onNavigateToProfile(cleanUsername);
    } else {
      setSelectedUser(cleanUsername);
    }
  };

  return (
    <>
      <span className={className}>
        {parts.map((part, index) => {
          if (/^@[a-zA-Z0-9_]+$/.test(part)) {
            return (
              <span
                key={index}
                className="mention-tag"
                onClick={(e) => handleMentionClick(part, e)}
                title={`View @${part.replace(/^@/, '')}'s profile`}
              >
                {part}
              </span>
            );
          }
          return part;
        })}
      </span>

      {selectedUser && (
        <PublicProfileModal
          username={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </>
  );
};

export default FormattedText;
