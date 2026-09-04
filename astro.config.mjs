import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://viniciusextremxd.github.io',
  base: process.env.GAAP_PAGES_BUILD === 'true' ? '/gaap-landing-page/' : '/',
  trailingSlash: 'always',
  output: 'static',
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1', port: 4321 },
});
