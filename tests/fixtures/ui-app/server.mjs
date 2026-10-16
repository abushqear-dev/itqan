// Tiny static server for the UI fixture: pages plus /api/shifts. Run directly or import start().
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const pages = { '/': 'index.html', '/shifts': 'index.html', '/bad': 'bad.html', '/mockup': 'mockup.html' };
const shifts = [{ id: 1, name: 'Morning shift', spots: 4 }, { id: 2, name: 'Evening shift', spots: 0 }];

export function start(port = 0) {
  const server = http.createServer((req, res) => {
    const p = new URL(req.url, 'http://x').pathname;
    if (p === '/api/shifts') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(shifts)); }
    if (pages[p]) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(path.join(dir, pages[p]))); }
    res.writeHead(404); res.end('not found');
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start(Number(process.env.PORT) || 4173).then(({ url }) => console.log(`fixture app at ${url}`));
}
