import { useState, useEffect } from 'react';
import '../styles/error-alert.css';

const ErrorAlert = ({ error, onClose, autoClose = 5000 }) => {
  const [isVisible, setIsVisible] = useState(!!error);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      if (autoClose) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          onClose?.();
        }, autoClose);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [error, autoClose, onClose]);

  if (!isVisible || !error) return null;

  return (
    <div className="error-alert" role="alert">
      <div className="error-alert-content">
        <div className="error-alert-icon">⚠️</div>
        <div className="error-alert-message">
          <h3 className="error-alert-title">Error</h3>
          <p className="error-alert-text">{error}</p>
        </div>
        <button
          className="error-alert-close"
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          aria-label="Close error"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default ErrorAlert;
