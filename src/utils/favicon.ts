import { getDomain } from './url';
import type { Settings } from '@/types';

export function getFaviconUrl(url: string, settings: Settings): string | null {
  const domain = getDomain(url);
  if (!domain) return null;

  switch (settings.faviconSource) {
    case 'google':
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    case 'duckduckgo':
      return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    case 'custom':
      return settings.customFaviconUrl
        ? settings.customFaviconUrl.replace('{domain}', domain)
        : null;
    default:
      return null;
  }
}