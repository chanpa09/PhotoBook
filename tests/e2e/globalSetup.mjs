import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';

const host = '127.0.0.1';
const port = 4173;
const distDir = resolve(process.cwd(), 'dist');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

export default async function globalSetup() {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', `http://${host}:${port}`);
    const pathname = decodeURIComponent(url.pathname);
    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const filePath = resolve(join(distDir, requestedPath));

    if (!filePath.startsWith(distDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
    });
    createReadStream(filePath).pipe(response);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });

  return async () => {
    server.closeAllConnections?.();
    await new Promise((resolve) => {
      server.close(resolve);
    });
  };
}
