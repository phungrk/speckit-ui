import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleCopilot } from './server/copilot.ts';
import { handleProject } from './server/github.ts';

export default defineConfig(({ mode }) => {
  // Expose .env to the API handlers (server-side only; nothing is prefixed VITE_).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    plugins: [
      react(),
      {
        // Serve the API from the dev server so `npm run dev` is all you need.
        name: 'speckit-api',
        configureServer(server) {
          server.middlewares.use('/api/copilot', (req, res) => void handleCopilot(req, res));
          server.middlewares.use('/api/project', (req, res) => void handleProject(req, res));
        }
      }
    ]
  };
});
