import React, { useState, useEffect } from 'react';
import { TextureFile, TextureFrame, TextureAtlas } from '../types/TextureAtlas';
import { textureApi } from '../api/textureApi';

interface FrameDetailsProps {
  textureFile: TextureFile;
  selectedFrame: string | null;
  onFrameSelect: (frameId: string | null) => void;
  onSave: (updatedAtlas: TextureAtlas) => void; // Updated signature
}

export const FrameDetails: React.FC<FrameDetailsProps> = ({
  textureFile,
  selectedFrame,
  onFrameSelect,
  onSave,
}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAtlas, setLocalAtlas] = useState<TextureAtlas>(textureFile.atlas);

  // Update local atlas state if textureFile prop changes (e.g., new file selected)
  useEffect(() => {
    setLocalAtlas(textureFile.atlas);
    setError(null); // Clear error when file changes
    setSaving(false); // Clear saving state
  }, [textureFile]);

  const frames = Object.entries(localAtlas.frames);
  const currentFrame = selectedFrame ? localAtlas.frames[selectedFrame] : null;

  const handleFrameUpdate = (frameKey: string, updates: Partial<TextureFrame>) => {
    const updatedAtlas = {
      ...localAtlas,
      frames: {
        ...localAtlas.frames,
        [frameKey]: {
          ...localAtlas.frames[frameKey],
          ...updates,
        },
      },
    };
    setLocalAtlas(updatedAtlas); // Update local state immediately
    // Debounce or trigger save based on interaction?
    // For now, we rely on the explicit Save button
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    setError(null);

    try {
      await textureApi.saveTexture(textureFile.id, localAtlas);
      onSave(localAtlas); // Pass the updated atlas back to App
    } catch (err) {
      setError('Failed to save changes');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="frame-details-editor">
      {error && <div className="error">{error}</div>}

      <div className="frame-list">
        <h3>Frames</h3>
        <ul>
          {frames.map(([key]) => (
            <li
              key={key}
              className={selectedFrame === key ? 'selected' : ''}
              onClick={() => onFrameSelect(key)} // Use passed handler
            >
              {key}
            </li>
          ))}
        </ul>
      </div>

      {currentFrame && selectedFrame && (
        <div className="frame-editor">
          <h3>Frame Details: {selectedFrame}</h3>
          <div className="frame-fields">
            {/* X and Y coordinates */}
            <label>
              X:
              <input
                type="number"
                value={currentFrame.frame.x}
                onChange={e =>
                  handleFrameUpdate(selectedFrame, {
                    frame: { ...currentFrame.frame, x: parseInt(e.target.value, 10) || 0 },
                  })
                }
              />
            </label>
            <label>
              Y:
              <input
                type="number"
                value={currentFrame.frame.y}
                onChange={e =>
                  handleFrameUpdate(selectedFrame, {
                    frame: { ...currentFrame.frame, y: parseInt(e.target.value, 10) || 0 },
                  })
                }
              />
            </label>
            {/* Width and Height */}
            <label>
              W:
              <input
                type="number"
                value={currentFrame.frame.w}
                onChange={e =>
                  handleFrameUpdate(selectedFrame, {
                    frame: { ...currentFrame.frame, w: parseInt(e.target.value, 10) || 0 },
                  })
                }
              />
            </label>
            <label>
              H:
              <input
                type="number"
                value={currentFrame.frame.h}
                onChange={e =>
                  handleFrameUpdate(selectedFrame, {
                    frame: { ...currentFrame.frame, h: parseInt(e.target.value, 10) || 0 },
                  })
                }
              />
            </label>
          </div>
          {/* Checkboxes in their own container */}
          <div className="frame-checkboxes">
            <label>
              <input
                type="checkbox"
                checked={currentFrame.rotated}
                onChange={e =>
                  handleFrameUpdate(selectedFrame, {
                    rotated: e.target.checked,
                  })
                }
              />
              Rotated
            </label>
            <label>
              <input
                type="checkbox"
                checked={currentFrame.trimmed}
                onChange={e =>
                  handleFrameUpdate(selectedFrame, {
                    trimmed: e.target.checked,
                  })
                }
              />
              Trimmed
            </label>
          </div>
        </div>
      )}

      <div className="actions">
        <button onClick={handleSaveChanges} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};
