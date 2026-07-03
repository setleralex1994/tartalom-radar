// Pici statikus szerver a docs/ mappahoz — helyi elonezethez (`npm run site`).
// Elesben a GitHub Pages szolgalja ki ugyanezt a mappat, szerver nelkul.
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname, normalize } from 'path';
import { fileURLToPath } from 'url';

const docs = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'docs');
const PORT = Number(process.env.SITE_PORT || 4320);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = normalize(join(docs, p));
  if (!file.startsWith(docs)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, () => console.log(`docs elonezet: http://localhost:${PORT}`));
