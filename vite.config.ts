import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  // Try to find the API key in various common environment variable names.
  // If not found in environment variables, use the hardcoded key provided by the user.
  const apiKey = env.API_KEY || process.env.API_KEY || 
                 env.VITE_API_KEY || process.env.VITE_API_KEY || 
                 env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || 
                 'AIzaSyDGWAyFl9nv2Fpjpp06UoDn7dLAi6YbwOM';

  return {
    plugins: [react()],
    define: {
      // Explicitly define process.env.API_KEY to ensure it gets replaced by the actual string value during build.
      // We prioritize the variable from loadEnv (local .env) or process.env (deployment environment).
      // Using JSON.stringify ensures it's treated as a string literal in the compiled code.
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
    build: {
      outDir: 'dist',
    }
  };
});