import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const port = Number(process.env.PORT || 4173);
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requested = decodeURIComponent(url.pathname);
  const relative = requested === '/' ? 'demo/index.html' : requested.replace(/^\//, '');
  let path = normalize(join(root, relative));

  if (!path.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    if (statSync(path).isDirectory()) path = join(path, 'index.html');
    response.writeHead(200, {
      'Content-Type': types[extname(path)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    createReadStream(path).pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Demo:  http://127.0.0.1:${port}/demo/`);
  console.log(`Tests: http://127.0.0.1:${port}/tests/`);
});
