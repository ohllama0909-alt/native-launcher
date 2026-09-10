import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    // Bind for remote/browser previews; only localhost and the sandbox
    // preview domain are accepted as Host headers.
    host: true,
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1']
  },
  build: {
    outDir: 'dist'
  }
});
