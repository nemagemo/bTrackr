
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Netlify and Vite handle env vars differently. This polyfills process.env for the browser.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env': {} 
    },
  };
});
