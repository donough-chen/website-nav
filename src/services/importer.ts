import { nanoid } from 'nanoid';
import * as XLSX from 'xlsx';
import type { Site, Category } from '@/types';
import { normalizeUrl, ensureProtocol, isValidUrl } from '@/utils/url';

export interface ParsedData {
  sites: Array<Partial<Site> & { name: string; url: string; categoryName?: string }>;
  categories: Array<Partial<Category> & { name: string }>;
}

export interface ImportPreview {
  toAdd: Site[];
  duplicates: Array<{ imported: Site; existing: Site }>;
  newCategories: Category[];
  invalidCount: number;
}

export type ConflictStrategy = 'skip' | 'overwrite' | 'keepBoth';

export async function parseFile(file: File, promptPassword?: () => Promise<string | null>): Promise<ParsedData> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'json') return parseJson(await file.text(), promptPassword);
  if (ext === 'xlsx' || ext === 'xls') return parseExcel(await file.arrayBuffer());
  if (ext === 'csv') return parseCsv(await file.text());
  throw new Error('不支持的文件格式，请使用 JSON / Excel / CSV');
}

async function parseJson(text: string, promptPassword?: () => Promise<string | null>): Promise<ParsedData> {
  const data = JSON.parse(text);
  if (data.encrypted === true && data.data) {
    if (!promptPassword) throw new Error('此文件已加密，请从解密入口导入');
    const password = await promptPassword();
    if (!password) throw new Error('未输入密码，导入取消');
    const { decrypt } = await import('./crypto');
    try {
      const plain = await decrypt(data.data, password);
      const inner = JSON.parse(plain);
      return { sites: inner.sites ?? [], categories: inner.categories ?? [] };
    } catch {
      throw new Error('解密失败，密码错误或文件损坏');
    }
  }
  if (Array.isArray(data)) return { sites: data, categories: [] };
  return { sites: data.sites ?? [], categories: data.categories ?? [] };
}

function parseExcel(buf: ArrayBuffer): ParsedData {
  const wb = XLSX.read(buf, { type: 'array' });
  const first = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[first]);
  const sites = rows.map(row => ({
    name: String(row['名称'] ?? row['name'] ?? '').trim(),
    url: String(row['网址'] ?? row['url'] ?? '').trim(),
    description: String(row['描述'] ?? row['description'] ?? '').trim() || undefined,
    categoryName: String(row['分类'] ?? row['category'] ?? '').trim() || undefined,
    tags: String(row['标签'] ?? row['tags'] ?? '').split(/[,，]/).map(t => t.trim()).filter(Boolean),
    rating: Number(row['评分'] ?? row['rating']) || undefined,
    icon: String(row['图标'] ?? row['icon'] ?? '').trim() || undefined,
  }));
  return { sites, categories: [] };
}

function parseCsv(text: string): ParsedData {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { sites: [], categories: [] };
  const headers = lines[0].split(',').map(h => h.trim());
  const sites = lines.slice(1).map(line => {
    const cols = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => row[h] = (cols[i] ?? '').trim());
    return {
      name: row['name'] ?? row['名称'] ?? '',
      url: row['url'] ?? row['网址'] ?? '',
      description: row['description'] ?? row['描述'] ?? undefined,
      categoryName: row['category'] ?? row['分类'] ?? undefined,
      tags: (row['tags'] ?? row['标签'] ?? '').split(/[,，|]/).map(t => t.trim()).filter(Boolean),
    };
  });
  return { sites, categories: [] };
}

export function previewImport(
  parsed: ParsedData,
  existingSites: Site[],
  existingCategories: Category[],
): ImportPreview {
  const existingUrlMap = new Map(existingSites.map(s => [normalizeUrl(s.url), s]));
  const existingCatByName = new Map(existingCategories.map(c => [c.name.toLowerCase(), c]));
  const existingCatById = new Map(existingCategories.map(c => [c.id, c]));

  // ✅ 关键修复：旧 categoryId → 目标 Category 的映射
  const catIdMap = new Map<string, Category>();
  // 名称 → 新创建的 Category
  const newCatByName = new Map<string, Category>();

  const now = Date.now();
  let orderStart = Math.max(-1, ...existingCategories.map(c => c.order)) + 1;

  // 第一步：处理导入的 categories，建立 id 映射
  for (const c of parsed.categories) {
    if (!c.name) continue;
    const nameLower = c.name.toLowerCase();
    const existing = existingCatByName.get(nameLower);
    if (existing) {
      // 已存在同名分类，映射到已有分类
      if (c.id) catIdMap.set(c.id as string, existing);
      continue;
    }
    // 新建分类
    const cat: Category = {
      id: nanoid(),
      name: c.name,
      icon: c.icon ?? '📁',
      color: c.color,
      order: orderStart++,
      createdAt: now,
      updatedAt: now,
    };
    newCatByName.set(nameLower, cat);
    if (c.id) catIdMap.set(c.id as string, cat); // ✅ 旧 id → 新 category
  }

  const toAdd: Site[] = [];
  const duplicates: ImportPreview['duplicates'] = [];
  let invalidCount = 0;

  for (const raw of parsed.sites) {
    if (!raw.name || !raw.url) { invalidCount++; continue; }
    const url = ensureProtocol(raw.url);
    if (!isValidUrl(url)) { invalidCount++; continue; }

    // ✅ 分类判定：优先按旧 id 映射 → 按 id 找已有 → 按 name 找 → 兜底
    let categoryId: string | undefined;
    const rawCatId = (raw as any).categoryId as string | undefined;
    const rawCatName = ((raw as any).categoryName ?? '').toLowerCase();

    if (rawCatId && catIdMap.has(rawCatId)) {
      // 场景 1：JSON 完整备份，通过导入的 categories 建立了映射
      categoryId = catIdMap.get(rawCatId)!.id;
    } else if (rawCatId && existingCatById.has(rawCatId)) {
      // 场景 2：旧 id 恰好命中现有分类
      categoryId = rawCatId;
    } else if (rawCatName) {
      // 场景 3：通过分类名匹配（Excel/CSV 常见）
      const cat = existingCatByName.get(rawCatName) ?? newCatByName.get(rawCatName);
      if (cat) {
        categoryId = cat.id;
      } else {
        // 名称不存在，自动创建
        const newCat: Category = {
          id: nanoid(),
          name: (raw as any).categoryName,
          icon: '📁',
          order: orderStart++,
          createdAt: now,
          updatedAt: now,
        };
        newCatByName.set(rawCatName, newCat);
        categoryId = newCat.id;
      }
    } else {
      // 场景 4：完全无分类信息，放入第一个分类或新建"未分类"
      const fallback = existingCategories[0] ?? Array.from(newCatByName.values())[0];
      if (fallback) {
        categoryId = fallback.id;
      } else {
        const uncat: Category = {
          id: nanoid(),
          name: '未分类',
          icon: '📁',
          order: orderStart++,
          createdAt: now,
          updatedAt: now,
        };
        newCatByName.set('未分类', uncat);
        categoryId = uncat.id;
      }
    }

    if (!categoryId) { invalidCount++; continue; }

    const site: Site = {
      id: nanoid(),
      name: raw.name,
      url,
      icon: raw.icon,
      description: raw.description,
      tags: raw.tags,
      rating: raw.rating,
      pinned: (raw as any).pinned,
      categoryId,
      createdAt: now,
      updatedAt: now,
      visitCount: (raw as any).visitCount ?? 0,
    };

    const key = normalizeUrl(url);
    const existing = existingUrlMap.get(key);
    if (existing) duplicates.push({ imported: site, existing });
    else toAdd.push(site);
  }

  return {
    toAdd,
    duplicates,
    newCategories: Array.from(newCatByName.values()),
    invalidCount,
  };
}

export interface ApplyResult {
  addedSites: Site[];
  updatedSites: Site[];
  newCategories: Category[];
}

export function applyImport(preview: ImportPreview, strategy: ConflictStrategy): ApplyResult {
  const addedSites: Site[] = [...preview.toAdd];
  const updatedSites: Site[] = [];

  for (const { imported, existing } of preview.duplicates) {
    if (strategy === 'skip') continue;
    if (strategy === 'overwrite') {
      updatedSites.push({
        ...existing,
        name: imported.name,
        url: imported.url,
        icon: imported.icon ?? existing.icon,
        description: imported.description ?? existing.description,
        tags: imported.tags ?? existing.tags,
        rating: imported.rating ?? existing.rating,
        categoryId: imported.categoryId, // ✅ 使用映射后的新 categoryId
        updatedAt: Date.now(),
      });
    } else if (strategy === 'keepBoth') {
      addedSites.push({ ...imported, id: nanoid(), name: imported.name + ' (副本)' });
    }
  }

  return { addedSites, updatedSites, newCategories: preview.newCategories };
}