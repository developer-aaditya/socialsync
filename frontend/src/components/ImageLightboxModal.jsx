import { useState, useEffect } from 'react';
import '../styles/lightbox.css';

const ImageLightboxModal = ({ imageUrl, altText, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => {
    setZoom((prev) => {
      const nextZoom = Math.max(prev - 0.5, 1);
      if (nextZoom === 1) setPosition({ x: 0, y: 0 });
      return nextZoom;
    });
  };
  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev + 0.25, 4));
    } else {
      setZoom((prev) => {
        const nextZoom = Math.max(prev - 0.25, 1);
        if (nextZoom === 1) setPosition({ x: 0, y: 0 });
        return nextZoom;
      });
    }
  };

  const handleMouseDown = (e) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {/* Top Action Controls */}
        <div className="lightbox-toolbar">
          <div className="zoom-controls">
            <button className="lightbox-btn" onClick={handleZoomOut} title="Zoom Out (-)">
              🔍-
            </button>
            <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
            <button className="lightbox-btn" onClick={handleZoomIn} title="Zoom In (+)">
              🔍+
            </button>
            {zoom > 1 && (
              <button className="lightbox-btn btn-reset" onClick={handleResetZoom}>
                Reset
              </button>
            )}
          </div>
          <button className="lightbox-close-btn" onClick={onClose} title="Close (Esc)">
            ×
          </button>
        </div>

        {/* Image Stage */}
        <div
          className="lightbox-image-stage"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={imageUrl}
            alt={altText || 'Post full preview'}
            className="lightbox-image"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            }}
          />
        </div>

        <div className="lightbox-hint">
          {zoom > 1 ? '🖐️ Drag to pan • Scroll to zoom' : '🔍 Click zoom buttons or scroll to zoom in'}
        </div>
      </div>
    </div>
  );
};

export default ImageLightboxModal;
