import { defineConfig } from 'vite';

export default defineConfig({
  base: '/garbage/',
  server: {
    host: true,
    allowedHosts: ['localhost', '127.0.0.1', '.ngrok-free.app'],
  },
});
