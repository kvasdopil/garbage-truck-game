import React, { useState, useRef, useEffect } from 'react';
import { TextureFile } from '../types/TextureAtlas';

interface TexturePreviewProps {
  textureFile: TextureFile;
  selectedFrame: string | null;
  onFrameSelect: (frameId: string | null) => void;
}

export const TexturePreview: React.FC<TexturePreviewProps> = ({
  textureFile,
  selectedFrame,
  onFrameSelect,
}) => {
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [naturalImageSize, setNaturalImageSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const imageRef = useRef<HTMLImageElement>(null);

  // Effect to calculate image dimensions and scale
  useEffect(() => {
    const updateSize = () => {
      if (imageRef.current) {
        setImageSize({
          width: imageRef.current.offsetWidth,
          height: imageRef.current.offsetHeight,
        });
        if (imageRef.current.naturalWidth) {
          setNaturalImageSize({
            width: imageRef.current.naturalWidth,
            height: imageRef.current.naturalHeight,
          });
        }
      }
    };

    const imgElement = imageRef.current;
    if (imgElement) {
      if (imgElement.complete) {
        updateSize();
      } else {
        imgElement.onload = updateSize;
      }
    }

    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      if (imgElement) {
        imgElement.onload = null;
      }
    };
  }, [textureFile]); // Recalculate if texture file changes

  const frames = Object.entries(textureFile.atlas.frames);
  const scale = naturalImageSize.width > 0 ? imageSize.width / naturalImageSize.width : 0;

  return (
    <div className="texture-preview-container" style={{ position: 'relative' }}>
      <img
        ref={imageRef}
        src={`http://localhost:3001/textures/${textureFile.atlas.meta.image}`}
        alt={textureFile.name}
        style={{ maxWidth: '100%', display: 'block' }}
      />
      {scale > 0 && (
        <div
          className="frame-overlay-container"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: imageSize.width,
            height: imageSize.height,
          }}
        >
          {frames.map(([key, frame]) => (
            <div
              key={key}
              className={`frame-box ${selectedFrame === key ? 'selected' : ''}`}
              style={{
                position: 'absolute',
                left: `${frame.frame.x * scale}px`,
                top: `${frame.frame.y * scale}px`,
                width: `${frame.frame.w * scale}px`,
                height: `${frame.frame.h * scale}px`,
              }}
              onClick={() => onFrameSelect(key)} // Use the passed handler
            >
              <span className="frame-name">{key}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
