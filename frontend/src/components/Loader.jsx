import React from 'react';
import '../styles/auth.css';

const Loader = ({ message = 'Loading SocialSync...' }) => {
  return (
    <div className="modern-splash-loader-container">
      <div className="splash-card">
        <div className="splash-logo-circle">
          <span className="splash-brand-icon">⚡</span>
        </div>
        <h2 className="splash-brand-title">SocialSync</h2>
        <div className="splash-progress-bar">
          <div className="splash-progress-fill"></div>
        </div>
        <p className="splash-status-text">{message}</p>
      </div>
    </div>
  );
};

export default Loader;
