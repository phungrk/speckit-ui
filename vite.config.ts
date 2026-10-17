import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { handleApi, listenHost } from './server/routes.ts';

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
  // Expose .env and .env.local to the API handlers (server-side only; nothing is prefixed VITE_).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  const isStatic = process.env.VITE_STATIC === '1';
  return {
    // GitHub Pages serves the app from /<repo>/.
    base: process.env.VITE_BASE || '/',
    // The commit the app was built from, shown in Settings so a stale page is easy to spot.
    define: { __BUILD__: JSON.stringify(buildCommit()) },
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
        // Token mode stays on this machine with `npm run dev -- --host` too (R6).
        config(c, { command }) {
          if (command !== 'serve') return;
          const h = c.server?.host;
          const { host, warning } = listenHost(h === true ? '0.0.0.0' : h || 'localhost');
          if (warning) console.warn(warning);
          return { server: { host } };
        },
        configureServer(server) {
          server.middlewares.use((req, res, next) => { if (!handleApi(req, res)) next(); });
        }
      }
    ]
  };
});

export function buildCommit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try { return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'dev'; }
}
