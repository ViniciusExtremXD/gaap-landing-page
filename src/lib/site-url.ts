/** Resolve application paths under Astro's deployment base, preserving external URLs and page anchors. */
export function siteUrl(path: string, base = import.meta.env?.BASE_URL ?? '/'): string {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i.test(path)) return path;

  const normalizedBase = `/${base.replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');
  return `${normalizedBase}${path.replace(/^\/+/, '')}`;
}
