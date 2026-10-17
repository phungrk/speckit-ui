// Production server: serves the built app from dist/ and the API.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApi, serverMode } from './routes.ts';

const DIST = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const PORT = Number(process.env.PORT) || 8787;
const MODE = serverMode();
// A token-mode server acts as the token's owner for everyone who reaches it, so it stays on this machine.
const LOCAL = '127.0.0.1';
let HOST = process.env.HOST?.trim() || (MODE === 'token' ? LOCAL : undefined);
if (MODE === 'token' && HOST !== LOCAL && HOST !== 'localhost') {
  if (process.env.ALLOW_REMOTE_TOKEN_MODE === '1') {
    console.warn(`Token mode on ${HOST}: everyone who can reach this server acts as the GITHUB_TOKEN owner.`);
  } else {
    console.warn(`Token mode: refusing to listen on ${HOST}. Everyone who could reach it would act as the GITHUB_TOKEN owner.
Listening on ${LOCAL} instead. Set up sign-in (GITHUB_APP_CLIENT_ID/SECRET) to share the server, or set ALLOW_REMOTE_TOKEN_MODE=1.`);
    HOST = LOCAL;
  }
}
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json'
};

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

createServer((req, res) => {
  if (handleApi(req, res)) return;
  const path = (req.url || '/').split('?')[0];
  let file = '';
  try { file = normalize(join(DIST, decodeURIComponent(path))); } catch { /* malformed URI: serve the app */ }
  const target = file.startsWith(DIST + sep) && existsSync(file) && statSync(file).isFile() ? file : join(DIST, 'index.html');
  res.setHeader('Content-Type', TYPES[extname(target)] || 'application/octet-stream');
  createReadStream(target).pipe(res);
}).listen(PORT, HOST, () => console.log(`Speckit Workspace (${MODE} mode) on http://${HOST && HOST !== '0.0.0.0' ? HOST : 'localhost'}:${PORT}`));
