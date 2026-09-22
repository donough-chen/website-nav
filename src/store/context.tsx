import { createContext } from 'preact';
import { useContext, useReducer, useEffect, useRef, useMemo, useCallback } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { reducer, initialState, defaultAuthConfig, type Action } from './reducer';
import { createActions, type Actions } from './actions';
import type { AppState } from '@/types';
import { storage, STORE_KEYS, debouncedSave } from '@/adapters/storage';
import { authService } from '@/services/authService';

interface Ctx {
  state: AppState;
  dispatch: (a: Action) => void;
  actions: Actions;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ComponentChildren }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // getState 使用 ref 保持最新
  const stateRef = useRef(state);
  stateRef.current = state;
  const getState = useCallback(() => stateRef.current, []);

  const actions = useMemo(() => createActions(dispatch, getState), [getState]);

  // 初始加载
  useEffect(() => {
    const hasPassword = authService.hasPassword();
    const authConfig = { ...defaultAuthConfig, ...(storage.get(STORE_KEYS.AUTH_CONFIG) ?? {}), hasPassword };

    // 判定初始 mode
    let mode: AppState['auth']['mode'] = 'open';
    let sessionExpireAt: number | null = null;

    if (hasPassword) {
      const session = authService.getSession();
      if (session) {
        // 有有效会话，尝试标记为 admin（但内存密码需要真实解锁才能得到；此处仅信任会话）
        // 注意：会话仅记录"已解锁"标记，真正的加密操作需要用户重新输入密码时才可用
        mode = 'admin';
        sessionExpireAt = session.expireAt || null;
      } else {
        mode = 'guest';
      }
    }

    dispatch({
      type: 'INIT',
      payload: {
        sites: storage.get(STORE_KEYS.SITES) ?? [],
        categories: storage.get(STORE_KEYS.CATEGORIES) ?? getDefaultCategories(),
        settings: { ...initialState.settings, ...(storage.get(STORE_KEYS.SETTINGS) ?? {}) },
        tombstones: storage.get(STORE_KEYS.TOMBSTONES) ?? [],
        searchHistory: storage.get(STORE_KEYS.SEARCH_HISTORY) ?? [],
        syncConfig: { ...initialState.syncConfig, ...(storage.get(STORE_KEYS.SYNC_CONFIG) ?? {}) },
        authConfig,
        auth: { ...initialState.auth, mode, sessionExpireAt },
        publicSourceConfig: { ...initialState.publicSourceConfig, ...(storage.get(STORE_KEYS.PUBLIC_SOURCE_CONFIG) ?? {}) },
      },
    });
  }, []);

  // 自动持久化（保持原有）
  useEffect(() => { if (!state.loaded) return; debouncedSave(STORE_KEYS.SITES, state.sites); }, [state.sites, state.loaded]);
  useEffect(() => { if (!state.loaded) return; debouncedSave(STORE_KEYS.CATEGORIES, state.categories); }, [state.categories, state.loaded]);
  useEffect(() => { if (!state.loaded) return; debouncedSave(STORE_KEYS.SETTINGS, state.settings); }, [state.settings, state.loaded]);
  useEffect(() => { if (!state.loaded) return; debouncedSave(STORE_KEYS.TOMBSTONES, state.tombstones); }, [state.tombstones, state.loaded]);
  useEffect(() => { if (!state.loaded) return; debouncedSave(STORE_KEYS.SEARCH_HISTORY, state.searchHistory); }, [state.searchHistory, state.loaded]);
  useEffect(() => { if (!state.loaded) return; debouncedSave(STORE_KEYS.SYNC_CONFIG, state.syncConfig); }, [state.syncConfig, state.loaded]);
  useEffect(() => { if (!state.loaded) return; debouncedSave(STORE_KEYS.AUTH_CONFIG, state.authConfig); }, [state.authConfig, state.loaded]);
  useEffect(() => { if (!state.loaded) return; debouncedSave(STORE_KEYS.PUBLIC_SOURCE_CONFIG, state.publicSourceConfig); }, [state.publicSourceConfig, state.loaded]);

  return <AppContext.Provider value={{ state, dispatch, actions }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

export function useActions() {
  return useApp().actions;
}

function getDefaultCategories() {
  const now = Date.now();
  return [
    { id: 'default', name: '常用', icon: '⭐', order: 0, createdAt: now, updatedAt: now },
  ];
}