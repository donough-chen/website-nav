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
  getState: () => AppState;
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
    dispatch({
      type: 'INIT',
      payload: {
        sites: storage.get(STORE_KEYS.SITES) ?? [],
        categories: storage.get(STORE_KEYS.CATEGORIES) ?? [],
        settings: { ...initialState.settings, ...(storage.get(STORE_KEYS.SETTINGS) ?? {}) },
        syncConfig: { ...initialState.syncConfig, ...(storage.get(STORE_KEYS.SYNC_CONFIG) ?? {}) },
        tombstones: storage.get(STORE_KEYS.TOMBSTONES) ?? [],
        authConfig: { ...initialState.authConfig, ...(storage.get(STORE_KEYS.AUTH_CONFIG) ?? {}) },
        publicSourceConfig: { ...initialState.publicSourceConfig, ...(storage.get(STORE_KEYS.PUBLIC_SOURCE_CONFIG) ?? {}) },
        favorites: storage.get(STORE_KEYS.FAVORITES) ?? [],
        appMode: storage.get(STORE_KEYS.APP_MODE) ?? null,
      },
    });
  }, []);

  // 自动持久化（保持原有）
  useEffect(() => { if (!state.loaded) return; if (state.appMode === 'guest') return; debouncedSave(STORE_KEYS.SITES, state.sites); }, [state.sites, state.loaded]);
  useEffect(() => { if (!state.loaded) return; if (state.appMode === 'guest') return; debouncedSave(STORE_KEYS.CATEGORIES, state.categories); }, [state.categories, state.loaded]);
  useEffect(() => { if (!state.loaded) return; debouncedSave(STORE_KEYS.SETTINGS, state.settings); }, [state.settings, state.loaded]);
  useEffect(() => { if (!state.loaded) return; debouncedSave(STORE_KEYS.TOMBSTONES, state.tombstones); }, [state.tombstones, state.loaded]);
  useEffect(() => { if (!state.loaded) return; debouncedSave(STORE_KEYS.SEARCH_HISTORY, state.searchHistory); }, [state.searchHistory, state.loaded]);
  useEffect(() => { if (!state.loaded) return; debouncedSave(STORE_KEYS.SYNC_CONFIG, state.syncConfig); }, [state.syncConfig, state.loaded]);
  useEffect(() => { if (!state.loaded) return; debouncedSave(STORE_KEYS.AUTH_CONFIG, state.authConfig); }, [state.authConfig, state.loaded]);
  useEffect(() => { if (!state.loaded) return; debouncedSave(STORE_KEYS.PUBLIC_SOURCE_CONFIG, state.publicSourceConfig); }, [state.publicSourceConfig, state.loaded]);
  useEffect(() => { if (!state.loaded) return; debouncedSave(STORE_KEYS.FAVORITES, state.favorites); }, [state.favorites, state.loaded]);
  useEffect(() => { if (!state.loaded) return; if (state.appMode) debouncedSave(STORE_KEYS.APP_MODE, state.appMode);}, [state.appMode, state.loaded]);

  return <AppContext.Provider value={{ state, dispatch, actions, getState }}>{children}</AppContext.Provider>;
}

// export function useApp() {
//   const ctx = useContext(AppContext);
//   if (!ctx) throw new Error('useApp must be inside AppProvider');
//   return ctx;
// }

// export function useActions() {
//   return useApp().actions;
// }

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return { state: ctx.state, dispatch: ctx.dispatch };
}

/** ✅ actions 只创建一次，通过 getState 始终读最新 state */
export function useActions() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useActions must be inside AppProvider');
  return useMemo(
    () => createActions(ctx.dispatch, ctx.getState),
    // 只依赖 dispatch / getState，稳定引用；actions 内部读的是最新 state
    [ctx.dispatch]
  );
}

function getDefaultCategories() {
  const now = Date.now();
  return [
    { id: 'default', name: '常用', icon: '⭐', order: 0, createdAt: now, updatedAt: now },
  ];
}