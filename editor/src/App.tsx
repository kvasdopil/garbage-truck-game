import React, { useState } from 'react';
import { ResourceList } from './components/ResourceList';
import { TextureFile, TextureAtlas } from './types/TextureAtlas';
import { textureApi } from './api/textureApi';
import { modelApi } from './api/modelApi';
import './App.css';
// Import new components
import { TexturePreview } from './components/TexturePreview';
import { FrameDetails } from './components/FrameDetails';

export const App: React.FC = () => {
  const [selectedTextureId, setSelectedTextureId] = useState<string | null>(null);
  const [selectedTextureData, setSelectedTextureData] = useState<TextureFile | null>(null);
  const [isLoadingAtlas, setIsLoadingAtlas] = useState(false);
  const [errorLoadingAtlas, setErrorLoadingAtlas] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);

  // Add state for models
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedModelData, setSelectedModelData] = useState<any>(null); // Use any for raw JSON

  const handleTextureSelect = async (textureId: string) => {
    // Clear selected model when a texture is selected
    setSelectedModelId(null);
    setSelectedModelData(null);

    setSelectedTextureId(textureId);
    setSelectedTextureData(null);
    setSelectedFrame(null);
    setIsLoadingAtlas(true);
    setErrorLoadingAtlas(null);
    try {
      const textureData = await textureApi.getTextureAtlas(textureId);
      setSelectedTextureData(textureData);
    } catch (err) {
      console.error('Failed to load texture atlas:', err);
      setErrorLoadingAtlas('Failed to load texture details.');
    } finally {
      setIsLoadingAtlas(false);
    }
  };

  // Add handler for model selection
  const handleModelSelect = async (modelId: string) => {
    // Clear selected texture when a model is selected
    setSelectedTextureId(null);
    setSelectedTextureData(null);
    setSelectedFrame(null);

    setSelectedModelId(modelId);
    setSelectedModelData(null);
    try {
      const modelData = await modelApi.getModelData(modelId);
      setSelectedModelData(modelData);
    } catch (err) {
      console.error('Failed to load model data:', err);
      // Maybe set a different error state specific to model *data* loading
      // setErrorLoadingModels('Failed to load model details.');
    }
  };

  const handleFrameSelect = (frameId: string | null) => {
    setSelectedFrame(frameId);
  };

  const handleSave = (updatedAtlas: TextureAtlas) => {
    if (selectedTextureId) {
      setSelectedTextureData(prevData => (prevData ? { ...prevData, atlas: updatedAtlas } : null));
    }
  };

  return (
    <div className="app">
      <main>
        {/* Column 1: Unified Resource List */}
        <div className="texture-list-container">
          {/* Use ResourceList for Textures */}
          <ResourceList
            title="Textures"
            fetchFunction={textureApi.getTextures}
            onSelect={handleTextureSelect}
            selectedId={selectedTextureId}
          />

          {/* Use ResourceList for Models */}
          <ResourceList
            title="Models"
            fetchFunction={modelApi.getModelList}
            onSelect={handleModelSelect}
            selectedId={selectedModelId}
          />
        </div>

        {/* Column 2: Image Preview / Model JSON Preview */}
        <div className="texture-preview-column">
          {isLoadingAtlas && <div>Loading Texture...</div>}
          {!isLoadingAtlas && selectedTextureData && (
            <TexturePreview
              textureFile={selectedTextureData}
              selectedFrame={selectedFrame}
              onFrameSelect={handleFrameSelect}
            />
          )}
          {!selectedTextureData && !isLoadingAtlas && !selectedModelId && (
            <div>Select a texture file or a model</div>
          )}

          {/* New Model JSON Preview Logic */}
          {/* Need to handle model data loading state separately if desired */}
          {/* isLoadingModels && selectedModelId && <div>Loading Model Data...</div> */}
          {selectedModelId && selectedModelData && (
            <div className="json-preview-container">
              <h4>{selectedModelId} JSON Content:</h4>
              <pre>{JSON.stringify(selectedModelData, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Column 3: Frame List & Editor */}
        <div className="frame-details-column">
          {isLoadingAtlas && <div>Loading Details...</div>}
          {errorLoadingAtlas && <div className="error">{errorLoadingAtlas}</div>}
          {!isLoadingAtlas && !errorLoadingAtlas && selectedTextureData && (
            <FrameDetails
              textureFile={selectedTextureData}
              selectedFrame={selectedFrame}
              onFrameSelect={handleFrameSelect}
              onSave={handleSave}
            />
          )}
          {!selectedTextureId && !isLoadingAtlas && (
            <div>Select a texture file to edit details.</div>
          )}
        </div>
      </main>
    </div>
  );
};
