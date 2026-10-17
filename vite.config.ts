import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleCopilot } from './server/copilot.ts';

export default defineConfig(({ mode }) => {
  // Expose .env to the Copilot handler (server-side only; nothing is prefixed VITE_).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    plugins: [
      react(),
      {
        // Serve the Copilot proxy from the dev server so `npm run dev` is all you need.
        name: 'copilot-api',
        configureServer(server) {
          server.middlewares.use('/api/copilot', (req, res) => void handleCopilot(req, res));
        }
      }
    ]
  };
});
