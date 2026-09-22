export interface Site {
  id: string;
  name: string;
  url: string;
  icon?: string;
  description?: string;
  rating?: number;
  tags?: string[];
  categoryId: string;
  pinned?: boolean;
  visitCount?: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface Settings {
  theme: 'light' | 'dark' | 'auto';
  layout: 'card' | 'list' | 'compact';
  showRating: boolean;
  showDescription: boolean;
  sortBy: 'default' | 'name' | 'visits' | 'rating';
  faviconSource: 'google' | 'duckduckgo' | 'custom';
  customFaviconUrl?: string;
}

export interface Tombstone {
  id: string;
  type: 'site' | 'category';
  deletedAt: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncConfig {
  enabled: boolean;
  autoSync: boolean;
  provider: 'gist' | 'webdav';
  encrypted?: string;
  gistId?: string;
  lastSyncAt?: number;
}

export interface AppState {
  sites: Site[];
  categories: Category[];
  settings: Settings;
  tombstones: Tombstone[];
  searchHistory: string[];
  syncConfig: SyncConfig;
  syncStatus: SyncStatus;
  loaded: boolean;
}

export type SiteInput = Omit<Site, 'id' | 'createdAt' | 'updatedAt' | 'visitCount'>;
export type CategoryInput = Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'order'>;

export type AuthMode = 'open' | 'guest' | 'admin';

export interface AuthConfig {
  hasPassword: boolean;
  idleTimeoutMin: number;      // 0 = 永不自动锁定
  rememberDuration: number;    // 0 = 不记住会话
  welcomeDismissed: boolean;   // Welcome Banner 是否已关闭
}

export interface AuthState {
  mode: AuthMode;
  unlockedAt: number | null;
  sessionExpireAt: number | null;
  failedAttempts: number;
  lockedUntil: number;
}

export interface PublicSourceConfig {
  gistId?: string;            // 已发布/使用的公开 Gist ID
  autoPublish?: boolean;      // Admin 编辑后自动发布
  excludeTags?: string[];     // 发布时排除的标签
  lastPublishedAt?: number;
  lastFetchedAt?: number;
  lastEtag?: string;
  ownerLogin?: string;        // 发布者
  ownerAvatar?: string;
  sourceHint?: 'url' | 'env' | 'local'; // Gist ID 来源渠道
}

// 更新 AppState
export interface AppState {
  sites: Site[];
  categories: Category[];
  settings: Settings;
  tombstones: Tombstone[];
  searchHistory: string[];
  syncConfig: SyncConfig;
  syncStatus: SyncStatus;
  loaded: boolean;
  // 新增：
  auth: AuthState;
  authConfig: AuthConfig;
  publicSourceConfig: PublicSourceConfig;
}