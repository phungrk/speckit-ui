import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleCopilot } from './server/copilot.ts';
import { handleProject } from './server/github.ts';
import { handleGate, handleTracking } from './server/tracking.ts';

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data:",
  'connect-src https://api.github.com https://api.anthropic.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

export default defineConfig(({ mode }) => {
  // Expose .env to the API handlers (server-side only; nothing is prefixed VITE_).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  const isStatic = process.env.VITE_STATIC === '1';
  return {
    // GitHub Pages serves the app from /<repo>/.
    base: process.env.VITE_BASE || '/',
    plugins: [
      react(),
      {
        // The static build holds the viewer's tokens in the page: only load our own scripts,
        // and only talk to GitHub and Anthropic.
        name: 'static-csp',
        apply: 'build',
        transformIndexHtml: html => isStatic ? html.replace('<meta charset="utf-8">', `<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="no-referrer">`) : html
      },
      {
        // Serve the API from the dev server so `npm run dev` is all you need.
        name: 'speckit-api',
        configureServer(server) {
          server.middlewares.use('/api/copilot', (req, res) => void handleCopilot(req, res));
          server.middlewares.use('/api/project', (req, res) => void handleProject(req, res));
          server.middlewares.use('/api/tracking', (req, res) => void handleTracking(req, res));
          server.middlewares.use('/api/gates', (req, res) => void handleGate(req, res));
        }
      }
    ]
  };
});
