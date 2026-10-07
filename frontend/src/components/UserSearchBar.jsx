import { useState, useEffect, useRef } from 'react';
import '../styles/navbar.css';
import userApi from '../api/userApi';
import getMediaUrl from '../utils/mediaUrl';

const UserSearchBar = ({ onSelectUser }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await userApi.searchUsers(query.trim());
        setResults(data || []);
        setIsOpen(true);
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserClick = (username) => {
    setIsOpen(false);
    setQuery('');
    if (onSelectUser) onSelectUser(username);
  };

  return (
    <div className="nav-search-wrapper" ref={dropdownRef}>
      <div className="nav-search-input-box">
        <svg className="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          className="nav-search-input"
        />
        {loading && <div className="search-spinner" />}
        {query && (
          <button
            className="search-clear-btn"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div className="nav-search-dropdown">
          {results.length > 0 ? (
            results.map((user) => (
              <div
                key={user.id}
                className="search-result-item"
                onClick={() => handleUserClick(user.username)}
              >
                <img
                  src={
                    user.profile_picture
                      ? getMediaUrl(user.profile_picture)
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          user.full_name || user.username
                        )}&background=6366f1&color=fff`
                  }
                  alt={user.username}
                  className="search-result-avatar"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user.username
                    )}&background=6366f1&color=fff`;
                  }}
                />
                <div className="search-result-meta">
                  <span className="search-result-fullname">
                    {user.full_name || user.username}
                  </span>
                  <span className="search-result-username">@{user.username}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="search-no-results">
              No users matching "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearchBar;
