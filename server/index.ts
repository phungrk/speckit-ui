// Production server: serves the built app from dist/ and the API.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleCopilot } from './copilot.ts';
import { handleProject } from './github.ts';

const DIST = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const PORT = Number(process.env.PORT) || 8787;
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json'
};

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

createServer((req, res) => {
  const path = (req.url || '/').split('?')[0];
  if (path === '/api/copilot') return void handleCopilot(req, res);
  if (path === '/api/project') return void handleProject(req, res);
  let file = '';
  try { file = normalize(join(DIST, decodeURIComponent(path))); } catch { /* malformed URI: serve the app */ }
  const target = file.startsWith(DIST + sep) && existsSync(file) && statSync(file).isFile() ? file : join(DIST, 'index.html');
  res.setHeader('Content-Type', TYPES[extname(target)] || 'application/octet-stream');
  createReadStream(target).pipe(res);
}).listen(PORT, () => console.log(`Speckit Workspace on http://localhost:${PORT}`));
