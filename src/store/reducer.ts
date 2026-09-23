import type { AppState, Site, Category, Settings, SyncStatus, Tombstone, AuthMode, AuthConfig, PublicSourceConfig } from '@/types';

export type Action =
	| { type: 'INIT'; payload: Partial<AppState> }
	| { type: 'ADD_SITE'; payload: Site }
	| { type: 'UPDATE_SITE'; payload: { id: string; patch: Partial<Site> } }
	| { type: 'REMOVE_SITE'; payload: { id: string } }
	| { type: 'BATCH_ADD_SITES'; payload: Site[] }
	| { type: 'BATCH_UPDATE_SITES'; payload: Site[] }
	| { type: 'ADD_CATEGORY'; payload: Category }
	| { type: 'UPDATE_CATEGORY'; payload: { id: string; patch: Partial<Category> } }
	| { type: 'REMOVE_CATEGORY'; payload: { id: string; migrateTo?: string } }
	| { type: 'REORDER_CATEGORIES'; payload: string[] }
	| { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
	| { type: 'ADD_SEARCH_HISTORY'; payload: string }
	| { type: 'CLEAR_SEARCH_HISTORY' }
	| { type: 'SET_SYNC_STATUS'; payload: SyncStatus }
	| { type: 'UPDATE_SYNC_CONFIG'; payload: Partial<AppState['syncConfig']> }
	| { type: 'REPLACE_ALL'; payload: { sites: Site[]; categories: Category[]; tombstones: Tombstone[] } }
	| { type: 'SET_AUTH_MODE'; payload: { mode: AuthMode; sessionExpireAt?: number | null } }
	| { type: 'UPDATE_AUTH_CONFIG'; payload: Partial<AuthConfig> }
	| { type: 'SET_AUTH_FAIL'; payload: { failedAttempts: number; lockedUntil: number } }
	| { type: 'DISMISS_WELCOME' }
  | { type: 'UPDATE_PUBLIC_SOURCE_CONFIG'; payload: Partial<PublicSourceConfig> }
  | { type: 'REPLACE_PUBLIC_DATA'; payload: { sites: Site[]; categories: Category[] } }
  | { type: 'TOGGLE_FAVORITE'; payload: { id: string } }
  | { type: 'CLEAR_FAVORITES' };

export const defaultSettings: Settings = {
	theme: 'auto',
	layout: 'card',
	showRating: true,
	showDescription: true,
	sortBy: 'default',
	faviconSource: 'google',
};

export const defaultAuthConfig: AuthConfig = {
	hasPassword: false,
	idleTimeoutMin: 30,
	rememberDuration: 0,
	welcomeDismissed: false,
};

export const initialState: AppState = {
	sites: [],
	categories: [],
	settings: defaultSettings,
	tombstones: [],
	searchHistory: [],
	syncConfig: { enabled: false, autoSync: false, provider: 'gist' },
	syncStatus: 'idle',
	loaded: false,
	auth: {
		mode: 'open',
		unlockedAt: null,
		sessionExpireAt: null,
		failedAttempts: 0,
		lockedUntil: 0,
	},
	authConfig: defaultAuthConfig,
  publicSourceConfig: {
    autoPublish: false,
    excludeTags: [],
  },
  favorites: [],
};

function addTombstone(list: Tombstone[], t: Tombstone): Tombstone[] {
	return [...list.filter((x) => !(x.id === t.id && x.type === t.type)), t];
}

export function reducer(state: AppState, action: Action): AppState {
	switch (action.type) {
		case 'INIT':
			return { ...state, ...action.payload, loaded: true };

		case 'ADD_SITE':
			return { ...state, sites: [...state.sites, action.payload] };

		case 'UPDATE_SITE':
			return {
				...state,
				sites: state.sites.map((s) => (s.id === action.payload.id ? { ...s, ...action.payload.patch, updatedAt: Date.now() } : s)),
			};

    case 'REMOVE_SITE': {
      const site = state.sites.find(s => s.id === action.payload.id);
      const tombstones = site
        ? [...state.tombstones, { id: site.id, type: 'site' as const, deletedAt: Date.now() }]
        : state.tombstones;
      return {
        ...state,
        sites: state.sites.filter(s => s.id !== action.payload.id),
        favorites: state.favorites.filter(x => x !== action.payload.id), // ← 新增
        tombstones,
      };
    }

		case 'BATCH_ADD_SITES':
			return { ...state, sites: [...state.sites, ...action.payload] };

		case 'BATCH_UPDATE_SITES': {
			const map = new Map(action.payload.map((s) => [s.id, s]));
			return {
				...state,
				sites: state.sites.map((s) => map.get(s.id) ?? s),
			};
		}

		case 'ADD_CATEGORY':
			return { ...state, categories: [...state.categories, action.payload] };

		case 'UPDATE_CATEGORY':
			return {
				...state,
				categories: state.categories.map((c) => (c.id === action.payload.id ? { ...c, ...action.payload.patch, updatedAt: Date.now() } : c)),
			};

		case 'REMOVE_CATEGORY': {
			const { id, migrateTo } = action.payload;
			const now = Date.now();
			const sites = migrateTo
				? state.sites.map((s) => (s.categoryId === id ? { ...s, categoryId: migrateTo, updatedAt: now } : s))
				: state.sites.filter((s) => s.categoryId !== id);
			const removedSiteIds = migrateTo ? [] : state.sites.filter((s) => s.categoryId === id).map((s) => s.id);
			let tombstones = addTombstone(state.tombstones, { id, type: 'category', deletedAt: now });
			for (const sid of removedSiteIds) {
				tombstones = addTombstone(tombstones, { id: sid, type: 'site', deletedAt: now });
			}
			return {
				...state,
				sites,
				categories: state.categories.filter((c) => c.id !== id),
				tombstones,
			};
		}

		case 'REORDER_CATEGORIES': {
			const orderMap = new Map(action.payload.map((id, i) => [id, i]));
			return {
				...state,
				categories: state.categories.map((c) => ({ ...c, order: orderMap.get(c.id) ?? c.order, updatedAt: Date.now() })).sort((a, b) => a.order - b.order),
			};
		}

		case 'UPDATE_SETTINGS':
			return { ...state, settings: { ...state.settings, ...action.payload } };

		case 'ADD_SEARCH_HISTORY': {
			const kw = action.payload.trim();
			if (!kw) return state;
			const history = [kw, ...state.searchHistory.filter((h) => h !== kw)].slice(0, 10);
			return { ...state, searchHistory: history };
		}

		case 'CLEAR_SEARCH_HISTORY':
			return { ...state, searchHistory: [] };

		case 'SET_SYNC_STATUS':
			return { ...state, syncStatus: action.payload };

		case 'UPDATE_SYNC_CONFIG':
			return { ...state, syncConfig: { ...state.syncConfig, ...action.payload } };

		case 'REPLACE_ALL':
			return {
				...state,
				sites: action.payload.sites,
				categories: action.payload.categories,
				tombstones: action.payload.tombstones,
			};

		case 'SET_AUTH_MODE': {
			const now = Date.now();
			return {
				...state,
				auth: {
					...state.auth,
					mode: action.payload.mode,
					unlockedAt: action.payload.mode === 'admin' ? now : null,
					sessionExpireAt: action.payload.sessionExpireAt ?? null,
				},
			};
		}

		case 'UPDATE_AUTH_CONFIG':
			return { ...state, authConfig: { ...state.authConfig, ...action.payload } };

		case 'SET_AUTH_FAIL':
			return {
				...state,
				auth: {
					...state.auth,
					failedAttempts: action.payload.failedAttempts,
					lockedUntil: action.payload.lockedUntil,
				},
			};

		case 'DISMISS_WELCOME':
			return { ...state, authConfig: { ...state.authConfig, welcomeDismissed: true } };

    case 'UPDATE_PUBLIC_SOURCE_CONFIG':
      return { ...state, publicSourceConfig: { ...state.publicSourceConfig, ...action.payload } };

    case 'REPLACE_PUBLIC_DATA': {
      // 保留本地 visitCount（按 url 匹配）
      const localVisits = new Map(state.sites.map(s => [s.url, s.visitCount ?? 0]));
      const newSites = action.payload.sites.map(s => ({
        ...s,
        visitCount: localVisits.get(s.url) ?? s.visitCount ?? 0,
      }));
      return { ...state, sites: newSites, categories: action.payload.categories };
    }

    case 'TOGGLE_FAVORITE': {
      const idx = state.favorites.indexOf(action.payload.id);
      const next = idx >= 0
        ? state.favorites.filter(x => x !== action.payload.id)
        : [action.payload.id, ...state.favorites]; // 最新收藏置顶
      return { ...state, favorites: next };
    }

    case 'CLEAR_FAVORITES':
      return { ...state, favorites: [] };

		default:
			return state;
	}
}
