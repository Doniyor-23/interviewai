import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Proxy keeps the auth cookie same-origin in development.
    proxy: { '/api': { target: 'http://localhost:5005', changeOrigin: true } },
  },
});
