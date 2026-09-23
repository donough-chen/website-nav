const PREFIX = 'nav_';

class Storage {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('[Storage] set failed', e);
      return false;
    }
  }

  remove(key: string) {
    localStorage.removeItem(PREFIX + key);
  }

  keys(): string[] {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .map(k => k.slice(PREFIX.length));
  }
}

export const storage = new Storage();

// ✅ 改进：使用 requestIdleCallback 空闲时段写入，避免主线程阻塞
const timers = new Map<string, number>();
const idleQueue = new Map<string, any>();

const scheduleIdleWork = typeof requestIdleCallback !== 'undefined'
  ? (cb: () => void) => requestIdleCallback(cb, { timeout: 1000 })
  : (cb: () => void) => setTimeout(cb, 0);

export function debouncedSave<T>(key: string, value: T, delay = 300) {
  const existing = timers.get(key);
  if (existing) window.clearTimeout(existing);

  idleQueue.set(key, value);

  const t = window.setTimeout(() => {
    timers.delete(key);
    scheduleIdleWork(() => {
      const v = idleQueue.get(key);
      if (v !== undefined) {
        storage.set(key, v);
        idleQueue.delete(key);
      }
    });
  }, delay);
  timers.set(key, t);
}

/** 立即刷盘（页面卸载前调用） */
export function flushAll() {
  for (const [key, timer] of timers) {
    window.clearTimeout(timer);
    const v = idleQueue.get(key);
    if (v !== undefined) storage.set(key, v);
  }
  timers.clear();
  idleQueue.clear();
}

// 页面卸载时强制刷盘，防数据丢失
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushAll);
  window.addEventListener('pagehide', flushAll);
}

export const sessionStore = {
  get<T>(key: string): T | null {
    try {
      const raw = sessionStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  set<T>(key: string, value: T) {
    try { sessionStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch {}
  },
  remove(key: string) { sessionStorage.removeItem(PREFIX + key); },
};

export const STORE_KEYS = {
  SITES: 'sites',
  CATEGORIES: 'categories',
  SETTINGS: 'settings',
  TOMBSTONES: 'tombstones',
  SEARCH_HISTORY: 'search_history',
  SYNC_CONFIG: 'sync_config',
  DEVICE_ID: 'device_id',
  AUTH_CONFIG: 'auth_config',
  SESSION: 'session', // sessionStorage
  PUBLIC_SOURCE_CONFIG: 'public_source_config',
  FAVORITES: 'favorites',
} as const;