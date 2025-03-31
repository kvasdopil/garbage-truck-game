# Phaser Texture Atlas Editor

A web-based editor for Phaser texture atlas JSON files. This tool allows you to view and edit texture atlas specifications used in Phaser games.

## Features

- View list of available texture atlas files
- Display texture image with marked regions
- Edit region properties (name, position, dimensions)
- Live preview of changes
- Auto-save changes to disk

## Project Structure

```
editor/
├── src/
│   ├── components/    # React components
│   ├── types/        # TypeScript type definitions
│   ├── api/          # Backend API endpoints
│   └── App.tsx       # Main application component
├── server/           # Express backend server
└── public/          # Static assets
```

## Development

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. The application will be available at `http://localhost:5173`

## Texture Atlas Format

The editor works with Phaser texture atlas files in the following format:

```json
{
  "frames": {
    "spriteName": {
      "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }
    }
  },
  "meta": {
    "image": "texture.png",
    "size": { "w": 512, "h": 512 }
  }
}
```

## Technologies Used

- React + TypeScript
- Vite
- Ant Design (UI components)
- Express (Backend)
- Node.js file system API
