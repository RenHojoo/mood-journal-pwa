import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/mood-journal-pwa/',
  plugins: [react()],
  publicDir: 'public',
  server: {
    https: false,
  },
});
