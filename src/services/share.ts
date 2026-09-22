import type { Site } from '@/types';

/** 生成分享链接：将单个网址信息编码到 URL 中 */
export function generateShareLink(site: Site, baseUrl = location.origin + location.pathname): string {
  const payload = {
    n: site.name,
    u: site.url,
    d: site.description,
    t: site.tags,
    r: site.rating,
    i: site.icon,
  };
  const json = JSON.stringify(payload);
  // UTF-8 → base64（兼容中文）
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return `${baseUrl}#share=${b64}`;
}

/** 解析分享链接 */
export function parseShareLink(): Partial<Site> | null {
  const hash = location.hash;
  const m = hash.match(/[#&]share=([^&]+)/);
  if (!m) return null;
  try {
    const json = decodeURIComponent(escape(atob(m[1])));
    const p = JSON.parse(json);
    return {
      name: p.n, url: p.u, description: p.d,
      tags: p.t, rating: p.r, icon: p.i,
    };
  } catch {
    return null;
  }
}

export function clearShareHash() {
  if (location.hash.includes('share=')) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

/** 复制到剪贴板 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 降级
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}