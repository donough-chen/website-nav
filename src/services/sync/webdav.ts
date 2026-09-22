import type { SyncAdapter, CloudData } from './types';
import { SyncError } from './types';

export interface WebDAVCredentials {
  baseUrl: string;
  username: string;
  password: string;
  filePath?: string;
}

export class WebDAVAdapter implements SyncAdapter {
  readonly name = 'webdav' as const;
  private baseUrl: string;
  private filePath: string;

  constructor(private creds: WebDAVCredentials) {
    this.baseUrl = creds.baseUrl.replace(/\/$/, '');
    this.filePath = creds.filePath ?? '/nav-data.json';
    if (!this.filePath.startsWith('/')) this.filePath = '/' + this.filePath;
  }

  private authHeader() {
    return 'Basic ' + btoa(`${this.creds.username}:${this.creds.password}`);
  }

  async test(): Promise<boolean> {
    try {
      const r = await fetch(this.baseUrl, {
        method: 'PROPFIND',
        headers: { Authorization: this.authHeader(), Depth: '0' },
      });
      return r.ok || r.status === 207;
    } catch {
      return false;
    }
  }

  async pull(): Promise<CloudData | null> {
    const r = await fetch(this.baseUrl + this.filePath, {
      headers: { Authorization: this.authHeader() },
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new SyncError('PULL_FAILED', `拉取失败：${r.status}`);
    try {
      return await r.json();
    } catch {
      throw new SyncError('PARSE_ERROR', '云端数据解析失败');
    }
  }

  async push(data: CloudData): Promise<void> {
    const r = await fetch(this.baseUrl + this.filePath, {
      method: 'PUT',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!r.ok && r.status !== 201 && r.status !== 204) {
      throw new SyncError('PUSH_FAILED', `推送失败：${r.status}`);
    }
  }
}