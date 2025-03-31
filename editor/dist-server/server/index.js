import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Added: Define __filename and __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = 3001;
// Define the correct base directory for textures (project root)
const texturesBaseDir = path.join(__dirname, '../../../public/textures');
// Define base directory for models (project root src)
const modelsBaseDir = path.join(__dirname, '../../../src/models');
app.use(cors());
app.use(express.json());
// Serve static texture files from the correct directory
app.use('/textures', express.static(texturesBaseDir));
// Endpoint to get all texture atlas files (basic info only)
app.get('/api/textures', async (req, res) => {
    try {
        const files = await fs.readdir(texturesBaseDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        const textureFiles = jsonFiles.map(file => {
            const id = file.replace('.json', '');
            return {
                id: id,
                name: id, // Use ID as name, or derive differently if needed
            };
        });
        res.json(textureFiles);
    }
    catch (error) {
        console.error('Error fetching texture list:', error);
        res.status(500).send('Error fetching texture list');
    }
});
// Get a specific texture atlas file
app.get('/api/textures/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const filePath = path.join(texturesBaseDir, `${id}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        const atlas = JSON.parse(content);
        res.json({
            id,
            name: id,
            path: `/textures/${id}.json`,
            atlas,
        });
    }
    catch (error) {
        console.error('Error reading texture file:', error);
        res.status(404).json({ error: 'Texture file not found' });
    }
});
// Save changes to a texture atlas file
app.put('/api/textures/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { atlas } = req.body;
        const filePath = path.join(texturesBaseDir, `${id}.json`);
        await fs.writeFile(filePath, JSON.stringify(atlas, null, 2));
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error saving texture file:', error);
        res.status(500).json({ error: 'Failed to save texture file' });
    }
});
// --- Add Model Endpoints ---
// Endpoint to get all model files (basic info only)
app.get('/api/models', async (req, res) => {
    try {
        const files = await fs.readdir(modelsBaseDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        const modelFiles = jsonFiles.map(file => {
            const id = file.replace('.json', '');
            return { id: id, name: id }; // Use ID as name for simplicity
        });
        res.json(modelFiles);
    }
    catch (error) {
        console.error('Error fetching model list:', error);
        res.status(500).send('Error fetching model list');
    }
});
// Get a specific model file content
app.get('/api/models/:modelName', async (req, res) => {
    try {
        const { modelName } = req.params;
        const filePath = path.join(modelsBaseDir, `${modelName}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        const modelData = JSON.parse(content);
        res.json(modelData); // Send the raw JSON content
    }
    catch (error) {
        console.error('Error reading model file:', error);
        res.status(404).json({ error: 'Model file not found' });
    }
});
// --- End Model Endpoints ---
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
