import assert from 'node:assert/strict';
import { test } from 'node:test';
import { siteUrl } from '../src/lib/site-url';

test('resolves home, navigation and assets below a GitHub Pages repository path', () => {
  assert.equal(siteUrl('/', '/gaap/'), '/gaap/');
  assert.equal(siteUrl('/#historias', '/gaap/'), '/gaap/#historias');
  assert.equal(siteUrl('/privacidade/', '/gaap/'), '/gaap/privacidade/');
  assert.equal(siteUrl('/media/hero.webp', '/gaap/'), '/gaap/media/hero.webp');
  assert.equal(siteUrl('media/hero-480.webp', '/gaap/'), '/gaap/media/hero-480.webp');
  assert.equal(siteUrl('/media/video.mp4?version=2#t=3', '/gaap/'), '/gaap/media/video.mp4?version=2#t=3');
});

test('supports root deployments and any configured base without duplicate separators', () => {
  assert.equal(siteUrl('/media/hero.webp', '/'), '/media/hero.webp');
  assert.equal(siteUrl('/', '/'), '/');
  assert.equal(siteUrl('/privacidade/', '/outro-projeto'), '/outro-projeto/privacidade/');
  assert.equal(siteUrl('/favicon.svg', '/preview/gaap/'), '/preview/gaap/favicon.svg');
  assert.equal(siteUrl('/media/logo.webp'), '/media/logo.webp');
});

test('preserves external destinations and anchors belonging to the current page', () => {
  for (const path of [
    '#conteudo',
    '?modo=claro#conteudo',
    'https://apoia.se/projetogaap',
    'https://www.instagram.com/p/example/embed/',
    '//cdn.example.org/photo.webp',
    'mailto:contato@example.org',
    'data:image/svg+xml;base64,PHN2Zz4=',
  ]) {
    assert.equal(siteUrl(path, '/gaap/'), path);
  }
});
