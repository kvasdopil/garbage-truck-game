import { TextureFile, TextureAtlas } from '../types/TextureAtlas';

const API_URL = 'http://localhost:3001/api';

// Interface for the simplified list response
export interface TextureFileInfo {
  id: string;
  name: string;
}

export const textureApi = {
  // Get list of texture files (basic info)
  async getTextures(): Promise<TextureFileInfo[]> {
    const response = await fetch(`${API_URL}/textures`);
    if (!response.ok) {
      throw new Error('Failed to fetch texture list');
    }
    return response.json();
  },

  // Get a specific texture atlas (full content)
  async getTextureAtlas(id: string): Promise<TextureFile> {
    // Renamed from getTexture for clarity
    const response = await fetch(`${API_URL}/textures/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch texture atlas');
    }
    return response.json();
  },

  // Save changes to a texture file
  async saveTexture(id: string, atlas: TextureAtlas): Promise<void> {
    const response = await fetch(`${API_URL}/textures/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ atlas }),
    });
    if (!response.ok) {
      throw new Error('Failed to save texture');
    }
  },
};
