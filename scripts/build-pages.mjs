import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../', import.meta.url));
process.env.GAAP_PAGES_BUILD = 'true';
const { default: config } = await import('../astro.config.mjs');
const destination = new URL(config.base, config.site);

function run(relativeBin, args) {
  const result = spawnSync(process.execPath, [resolve(root, relativeBin), ...args], {
    cwd: root, env: process.env, stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('node_modules/tsx/dist/cli.mjs', ['scripts/validate-content.ts', 'publish', destination.href]);
run('node_modules/astro/bin/astro.mjs', ['build']);

// Verify the actual emitted pages under the repository URL, including anchors and responsive assets.
const dist = resolve(root, 'dist');
const documents = new Map();
let checked = 0;
for (const route of ['', 'privacidade/']) {
  const htmlPath = resolve(dist, route, 'index.html');
  documents.set(new URL(route, destination).pathname, new JSDOM(readFileSync(htmlPath, 'utf8')).window.document);
}
for (const [route, document] of documents) {
  const pageUrl = new URL(route, destination);
  const references = [...document.querySelectorAll('[src], [href], [poster]')].flatMap(element =>
    ['src', 'href', 'poster'].map(attribute => element.getAttribute(attribute)).filter(Boolean));
  for (const element of document.querySelectorAll('[srcset]')) {
    references.push(...element.getAttribute('srcset').split(',').map(candidate => candidate.trim().split(/\s+/)[0]));
  }
  for (const reference of references) {
    const url = new URL(reference, pageUrl);
    if (url.origin !== destination.origin) continue;
    if (!url.pathname.startsWith(destination.pathname)) throw new Error(`URL fora da base pública: ${url}`);
    const relativePath = decodeURIComponent(url.pathname.slice(destination.pathname.length));
    const filePath = resolve(dist, relativePath, url.pathname.endsWith('/') ? 'index.html' : '');
    if (!filePath.startsWith(`${dist}${sep}`) || !existsSync(filePath)) throw new Error(`Arquivo público ausente: ${url}`);
    if (url.hash && documents.has(url.pathname) && !documents.get(url.pathname).getElementById(decodeURIComponent(url.hash.slice(1)))) {
      throw new Error(`Âncora pública ausente: ${url}`);
    }
    checked++;
  }
}
writeFileSync(resolve(dist, '.nojekyll'), '');
console.log(`GitHub Pages: ${checked} referências locais verificadas em ${destination.href}`);
