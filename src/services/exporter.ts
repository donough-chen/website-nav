import * as XLSX from 'xlsx';
import type { Site, Category } from '@/types';
import { encrypt } from './crypto';

export function exportAsJson(sites: Site[], categories: Category[]) {
  const data = {
    version: '1.0',
    exportedAt: Date.now(),
    encrypted: false,
    categories,
    sites,
  };
  download(JSON.stringify(data, null, 2), `nav-backup-${dateStr()}.json`, 'application/json');
}

export async function exportAsEncryptedJson(sites: Site[], categories: Category[], password: string) {
  const payload = { version: '1.0', categories, sites };
  const cipher = await encrypt(JSON.stringify(payload), password);
  const wrapped = {
    version: '1.0',
    exportedAt: Date.now(),
    encrypted: true,
    algorithm: 'AES-GCM-PBKDF2',
    data: cipher,
  };
  download(JSON.stringify(wrapped, null, 2), `nav-backup-encrypted-${dateStr()}.json`, 'application/json');
}

export function exportAsExcel(sites: Site[], categories: Category[]) {
  const catMap = new Map(categories.map(c => [c.id, c.name]));
  const rows = sites.map(s => ({
    名称: s.name, 网址: s.url, 分类: catMap.get(s.categoryId) ?? '',
    描述: s.description ?? '', 标签: (s.tags ?? []).join(', '),
    评分: s.rating ?? '', 图标: s.icon ?? '',
    置顶: s.pinned ? '是' : '', 访问次数: s.visitCount ?? 0,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '网址列表');
  XLSX.writeFile(wb, `nav-backup-${dateStr()}.xlsx`);
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function dateStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}