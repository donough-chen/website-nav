export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    let n = u.hostname.toLowerCase() + u.pathname.replace(/\/$/, '');
    if (u.search) n += u.search;
    return n;
  } catch {
    return url.trim().toLowerCase();
  }
}

export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function ensureProtocol(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return 'https://' + trimmed;
}