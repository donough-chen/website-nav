import { nanoid } from 'nanoid';
import type { Site, Category, SiteInput, CategoryInput, AppState } from '@/types';
import type { Action } from './reducer';
import { toast } from '@/utils/toast';

type Dispatch = (a: Action) => void;
type GetState = () => AppState;

export class AuthError extends Error {
	constructor() {
		super('permission denied');
		this.name = 'AuthError';
	}
}

/** 是否可以执行编辑操作 */
export function canEdit(state: AppState): boolean {
	return state.auth.mode === 'admin' || state.auth.mode === 'open';
}

/** 是否为访客只读模式 */
export function isGuest(state: AppState): boolean {
	return state.auth.mode === 'guest';
}

function requireLocalEdit(getState: GetState): boolean {
  const mode = getState().appMode;
  if (mode === 'open' || mode === 'admin') return true;
  toast.error('访客模式无编辑权限');
  return false;
}

function requireAdmin(getState: GetState): boolean {
  if (getState().appMode === 'admin') return true;
  toast.error('此操作需要管理员权限');
  return false;
}

export function createActions(dispatch: Dispatch, getState: GetState) {

	return {
		addSite(input: SiteInput) {
			requireLocalEdit(getState);
			const now = Date.now();
			const site: Site = { id: nanoid(), ...input, visitCount: 0, createdAt: now, updatedAt: now };
			dispatch({ type: 'ADD_SITE', payload: site });
			return site;
		},
		updateSite(id: string, patch: Partial<Site>) {
			requireLocalEdit(getState);
			dispatch({ type: 'UPDATE_SITE', payload: { id, patch } });
		},
		removeSite(id: string) {
			requireLocalEdit(getState);
			dispatch({ type: 'REMOVE_SITE', payload: { id } });
		},
		/** 访问网址：允许访客调用，仅更新 visitCount */
		visitSite(site: Site) {
			// 访问计数允许所有模式
			dispatch({
				type: 'UPDATE_SITE',
				payload: { id: site.id, patch: { visitCount: (site.visitCount ?? 0) + 1 } },
			});
			window.open(site.url, '_blank', 'noopener,noreferrer');
		},
		togglePin(id: string, pinned: boolean) {
			requireLocalEdit(getState);
			dispatch({ type: 'UPDATE_SITE', payload: { id, patch: { pinned } } });
		},
		addCategory(input: CategoryInput, order = 0) {
			requireAdmin(getState);
			const now = Date.now();
			const cat: Category = { id: nanoid(), ...input, order, createdAt: now, updatedAt: now };
			dispatch({ type: 'ADD_CATEGORY', payload: cat });
			return cat;
		},
		updateCategory(id: string, patch: Partial<Category>) {
			requireAdmin(getState);
			dispatch({ type: 'UPDATE_CATEGORY', payload: { id, patch } });
		},
		removeCategory(id: string, migrateTo?: string) {
			requireAdmin(getState);
			dispatch({ type: 'REMOVE_CATEGORY', payload: { id, migrateTo } });
		},
		reorderCategories(ids: string[]) {
			requireLocalEdit(getState);
			dispatch({ type: 'REORDER_CATEGORIES', payload: ids });
		},
		// 新增专用 action：接收外部分享（跳过权限校验）
		receiveSharedSite(input: SiteInput) {
			const now = Date.now();
			const site: Site = { id: nanoid(), ...input, visitCount: 0, createdAt: now, updatedAt: now };
			dispatch({ type: 'ADD_SITE', payload: site });
			return site;
		},
    /** 切换收藏：所有模式可用（本地存储） */
    toggleFavorite(id: string) {
      dispatch({ type: 'TOGGLE_FAVORITE', payload: { id } });
    },

    /** 清空收藏 */
    clearFavorites() {
      dispatch({ type: 'CLEAR_FAVORITES' });
    },
	};
};

export type Actions = ReturnType<typeof createActions>;
