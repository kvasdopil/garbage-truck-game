const API_BASE_URL = 'http://localhost:3001/api'; // Assuming your server runs on 3001

export interface ModelInfo {
  id: string;
  name: string;
}

// Fetches the list of available model names
export const getModelList = async (): Promise<ModelInfo[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/models`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: ModelInfo[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching model list:', error);
    throw new Error('Failed to fetch model list');
  }
};

// Fetches the content of a specific model JSON file
export const getModelData = async (modelName: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/models/${modelName}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: any = await response.json(); // Keep any for flexible JSON display
    return data;
  } catch (error) {
    console.error(`Error fetching model data for ${modelName}:`, error);
    throw new Error(`Failed to fetch model data for ${modelName}`);
  }
};

export const modelApi = {
  getModelList,
  getModelData,
};
