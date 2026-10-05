import { useState, useRef, useEffect } from 'react';
import '../styles/cropper.css';

const ImageCropperModal = ({ imageUrl, onCropComplete, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('full'); // 'full', '1:1', '4:3', '16:9'
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const previewCanvasRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
  }, [imageUrl]);

  useEffect(() => {
    if (imageLoaded) {
      drawPreview();
    }
  }, [imageLoaded, zoom, offset, aspectRatio]);

  const getTargetDimensions = () => {
    const img = imageRef.current;
    if (aspectRatio === 'full' && img && img.naturalWidth && img.naturalHeight) {
      const naturalRatio = img.naturalWidth / img.naturalHeight;
      if (naturalRatio >= 1) {
        return { width: 440, height: Math.round(440 / naturalRatio), ratio: naturalRatio };
      } else {
        return { width: Math.round(360 * naturalRatio), height: 360, ratio: naturalRatio };
      }
    }

    switch (aspectRatio) {
      case '4:3': return { width: 440, height: 330, ratio: 4/3 };
      case '16:9': return { width: 480, height: 270, ratio: 16/9 };
      case '1:1':
      default: return { width: 360, height: 360, ratio: 1/1 };
    }
  };

  const drawPreview = () => {
    const canvas = previewCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    const target = getTargetDimensions();

    canvas.width = target.width;
    canvas.height = target.height;

    ctx.clearRect(0, 0, target.width, target.height);

    if (aspectRatio === 'full') {
      ctx.drawImage(img, 0, 0, target.width, target.height);
      return;
    }

    const scale = Math.max(target.width / img.width, target.height / img.height) * zoom;
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    const drawX = (target.width - drawWidth) / 2 + offset.x;
    const drawY = (target.height - drawHeight) / 2 + offset.y;

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  };

  const handleMouseDown = (e) => {
    if (aspectRatio === 'full') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || aspectRatio === 'full') return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleApplyCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    if (aspectRatio === 'full') {
      onClose();
      return;
    }

    const target = getTargetDimensions();
    const exportWidth = Math.max(1200, img.naturalWidth || 1200);
    const exportHeight = Math.round(exportWidth / target.ratio);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;

    const ctx = exportCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const previewScale = Math.max(target.width / img.width, target.height / img.height) * zoom;
    const exportScale = (exportWidth / target.width) * previewScale;

    const drawWidth = img.width * exportScale;
    const drawHeight = img.height * exportScale;

    const drawX = (exportWidth - drawWidth) / 2 + offset.x * (exportWidth / target.width);
    const drawY = (exportHeight - drawHeight) / 2 + offset.y * (exportHeight / target.height);

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    exportCanvas.toBlob((blob) => {
      if (blob) {
        const croppedUrl = URL.createObjectURL(blob);
        const croppedFile = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
        onCropComplete(croppedFile, croppedUrl);
      }
    }, 'image/jpeg', 1.0);
  };

  const target = getTargetDimensions();

  return (
    <div className="crop-modal-overlay">
      <div className="crop-modal-card" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <div className="crop-header">
          <h3>✂️ Crop Image</h3>
          <button className="crop-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="crop-canvas-container">
          {!imageLoaded ? (
            <div className="crop-loading-placeholder">Loading image preview...</div>
          ) : (
            <canvas
              ref={previewCanvasRef}
              className="crop-canvas"
              style={{ width: `${target.width}px`, height: `${target.height}px` }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
            />
          )}
          {aspectRatio !== 'full' && imageLoaded && (
            <span className="crop-drag-hint">🖐️ Drag image to adjust frame position</span>
          )}
        </div>

        <div className="crop-controls">
          <div className="control-group">
            <label>Aspect Ratio / Mode:</label>
            <div className="ratio-btn-group">
              <button
                className={`ratio-btn ${aspectRatio === 'full' ? 'active' : ''}`}
                onClick={() => { setAspectRatio('full'); setOffset({ x: 0, y: 0 }); setZoom(1); }}
              >
                Full (Original)
              </button>
              <button
                className={`ratio-btn ${aspectRatio === '1:1' ? 'active' : ''}`}
                onClick={() => { setAspectRatio('1:1'); setOffset({ x: 0, y: 0 }); }}
              >
                1:1 Square
              </button>
              <button
                className={`ratio-btn ${aspectRatio === '4:3' ? 'active' : ''}`}
                onClick={() => { setAspectRatio('4:3'); setOffset({ x: 0, y: 0 }); }}
              >
                4:3 Photo
              </button>
              <button
                className={`ratio-btn ${aspectRatio === '16:9' ? 'active' : ''}`}
                onClick={() => { setAspectRatio('16:9'); setOffset({ x: 0, y: 0 }); }}
              >
                16:9 Wide
              </button>
            </div>
          </div>

          {aspectRatio !== 'full' && (
            <div className="control-group">
              <label>Zoom Level: {zoom.toFixed(1)}x</label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="zoom-slider"
              />
            </div>
          )}
        </div>

        <div className="crop-footer">
          <button className="btn-crop-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-crop-confirm" onClick={handleApplyCrop}>Apply Crop ✂️</button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
