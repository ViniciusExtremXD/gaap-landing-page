// Local-only failure scenarios over the production HTML. Never part of the site.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://127.0.0.1:4323').pathname;
    const scenario = path.startsWith('/__qa/') ? path : null;
    let file = resolve(root, '.' + (scenario ? '/index.html' : decodeURIComponent(path)));
    if (file !== root && !file.startsWith(root + sep)) throw new Error('outside root');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    let body = await readFile(file);
    if (scenario === '/__qa/no-js') body = Buffer.from(body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''));
    if (scenario === '/__qa/media-failure') body = Buffer.from(body.toString().replaceAll('/media/hero', '/media/missing-hero'));
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4323, '127.0.0.1', () => process.stdout.write('QA scenarios: http://127.0.0.1:4323/__qa/no-js and /__qa/media-failure\n'));
