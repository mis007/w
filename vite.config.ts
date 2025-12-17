
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load all environment variables (including those without VITE_ prefix)
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Polyfill process.env with actual values from the environment
      // usage of JSON.stringify ensures that values are injected as valid strings or valid JSON objects
      'process.env': JSON.stringify({
        API_BASE_URL: env.API_BASE_URL,
        API_KEY: env.API_KEY,
      }),
    },
  };
});
