// serve.ts — a tiny static server for play-testing Starlight Salvage locally.
// Node 22 standard library only. Run `node serve.ts`, then open
// http://localhost:8080 (or pass another port as the first argument).

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const port = parseInt(process.argv[2] || '8080', 10) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname);
  const file = join(here, 'game', path === '/' ? 'index.html' : path);
  if (!file.startsWith(join(here, 'game'))) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(port, () => {
  console.log(`Starlight Salvage at http://localhost:${port}`);
});
