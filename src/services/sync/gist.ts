import type { SyncAdapter, CloudData } from './types';
import { SyncError } from './types';

export interface GistCredentials {
  token: string;
  gistId?: string;
}

export class GistAdapter implements SyncAdapter {
  readonly name = 'gist' as const;
  private readonly FILE = 'nav-data.json';

  constructor(private creds: GistCredentials) {}

  get gistId() { return this.creds.gistId; }

  private headers() {
    return {
      'Authorization': `token ${this.creds.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  async test(): Promise<boolean> {
    try {
      const r = await fetch('https://api.github.com/user', { headers: this.headers() });
      return r.ok;
    } catch {
      return false;
    }
  }

  async pull(): Promise<CloudData | null> {
    if (!this.creds.gistId) return null;
    const r = await fetch(`https://api.github.com/gists/${this.creds.gistId}`, {
      headers: this.headers(),
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new SyncError('PULL_FAILED', `拉取失败：${r.status}`);
    const gist = await r.json();
    const content = gist.files?.[this.FILE]?.content;
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      throw new SyncError('PARSE_ERROR', '云端数据解析失败');
    }
  }

  async push(data: CloudData): Promise<void> {
    const body = {
      description: 'Nav Hub Data Backup',
      public: false,
      files: { [this.FILE]: { content: JSON.stringify(data, null, 2) } },
    };
    const url = this.creds.gistId
      ? `https://api.github.com/gists/${this.creds.gistId}`
      : 'https://api.github.com/gists';
    const method = this.creds.gistId ? 'PATCH' : 'POST';

    const r = await fetch(url, {
      method,
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new SyncError('PUSH_FAILED', `推送失败：${r.status}`);
    const result = await r.json();
    if (!this.creds.gistId) this.creds.gistId = result.id;
  }
}