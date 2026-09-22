import type { Site, Category } from '@/types';

const GITHUB_API = 'https://api.github.com';
const GIST_FILENAME = 'nav-public.json';
const GIST_DESC = 'Nav Public Data';

export interface PublicPayload {
  schema: '1.0';
  publishedAt: number;
  categories: Category[];
  sites: Site[];
  meta?: {
    total: number;
    excludeTags?: string[];
  };
}

export interface FetchResult {
  data: PublicPayload | null;
  etag?: string;
  notModified?: boolean;
  ownerLogin?: string;
  ownerAvatar?: string;
  updatedAt?: string;
}

export interface ResolvedSource {
  id: string;
  source: 'url' | 'env' | 'local';
}

export const publicSource = {
  /** 三级降级解析 Gist ID */
  resolve(localStoredId?: string): ResolvedSource | null {
    // 1. URL 参数
    const params = new URLSearchParams(location.search);
    const urlId = params.get('src');
    if (urlId) return { id: urlId, source: 'url' };

    // 2. 构建时环境变量
    const envId = import.meta.env.VITE_PUBLIC_GIST_ID as string | undefined;
    if (envId && envId.trim()) return { id: envId.trim(), source: 'env' };

    // 3. 本地存储
    if (localStoredId) return { id: localStoredId, source: 'local' };

    return null;
  },

  /** 匿名拉取（无需 Token） */
  async fetch(gistId: string, etag?: string): Promise<FetchResult> {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
    if (etag) headers['If-None-Match'] = etag;

    const res = await fetch(`${GITHUB_API}/gists/${gistId}`, { headers });

    if (res.status === 304) return { data: null, notModified: true };
    if (res.status === 404) throw new Error('Gist 不存在或已被删除');
    if (res.status === 403) throw new Error('API 请求受限，请稍后重试');
    if (!res.ok) throw new Error(`拉取失败: HTTP ${res.status}`);

    const body = await res.json();
    const file = body.files?.[GIST_FILENAME] ?? Object.values(body.files ?? {})[0] as any;
    if (!file) throw new Error('Gist 中无有效数据文件');

    // 大文件 truncated 时从 raw_url 拉取
    const content: string = file.truncated
      ? await (await fetch(file.raw_url)).text()
      : file.content;

    let payload: PublicPayload;
    try {
      payload = JSON.parse(content);
    } catch {
      throw new Error('数据格式无效');
    }

    if (!payload.schema) throw new Error('数据缺少版本标识');
    if (payload.schema !== '1.0') throw new Error(`不支持的数据版本 ${payload.schema}，请更新应用`);
    if (!Array.isArray(payload.sites) || !Array.isArray(payload.categories)) {
      throw new Error('数据结构损坏');
    }

    return {
      data: payload,
      etag: res.headers.get('etag') ?? undefined,
      ownerLogin: body.owner?.login,
      ownerAvatar: body.owner?.avatar_url,
      updatedAt: body.updated_at,
    };
  },

  /** 发布（需要 Token） */
  async publish(payload: PublicPayload, token: string, gistId?: string): Promise<string> {
    const body = {
      description: GIST_DESC,
      public: true,
      files: {
        [GIST_FILENAME]: { content: JSON.stringify(payload, null, 2) },
      },
    };
    const url = gistId ? `${GITHUB_API}/gists/${gistId}` : `${GITHUB_API}/gists`;
    const method = gistId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `发布失败: HTTP ${res.status}`);
    }

    const result = await res.json();
    return result.id as string;
  },

  /** 删除已发布的 Gist */
  async unpublish(gistId: string, token: string): Promise<void> {
    const res = await fetch(`${GITHUB_API}/gists/${gistId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`删除失败: HTTP ${res.status}`);
    }
  },

  /** 构造分享链接 */
  buildShareUrl(gistId: string, baseUrl?: string): string {
    const base = baseUrl ?? (location.origin + location.pathname);
    return `${base}?src=${gistId}`;
  },

  /** 按排除标签过滤 sites */
  filterExcluded(sites: Site[], excludeTags: string[]): Site[] {
    if (!excludeTags || excludeTags.length === 0) return sites;
    return sites.filter(s => !(s.tags ?? []).some(t => excludeTags.includes(t)));
  },

  /** 构造发布 payload（清理隐私字段） */
  buildPayload(sites: Site[], categories: Category[], excludeTags: string[] = []): PublicPayload {
    const filtered = this.filterExcluded(sites, excludeTags);
    // 去掉 visitCount 等隐私/无关字段
    const cleanSites: Site[] = filtered.map(s => ({
      id: s.id,
      name: s.name,
      url: s.url,
      icon: s.icon,
      description: s.description,
      tags: s.tags,
      rating: s.rating,
      pinned: s.pinned,
      categoryId: s.categoryId,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    // 只保留被引用的分类
    const usedCatIds = new Set(cleanSites.map(s => s.categoryId));
    const usedCats = categories.filter(c => usedCatIds.has(c.id));

    return {
      schema: '1.0',
      publishedAt: Date.now(),
      categories: usedCats,
      sites: cleanSites,
      meta: {
        total: cleanSites.length,
        excludeTags: excludeTags.length > 0 ? excludeTags : undefined,
      },
    };
  },
};