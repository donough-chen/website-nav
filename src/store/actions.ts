import { nanoid } from 'nanoid';
import type { Site, Category, SiteInput, CategoryInput, AppState } from '@/types';
import type { Action } from './reducer';
import { toast } from '@/utils/toast';

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

export const createActions = (dispatch: (a: Action) => void, getState: () => AppState) => {
	const requireAdmin = () => {
		if (!canEdit(getState())) {
			toast.error('🔒 需要管理员权限');
			throw new AuthError();
		}
	};

	return {
		addSite(input: SiteInput) {
			requireAdmin();
			const now = Date.now();
			const site: Site = { id: nanoid(), ...input, visitCount: 0, createdAt: now, updatedAt: now };
			dispatch({ type: 'ADD_SITE', payload: site });
			return site;
		},
		updateSite(id: string, patch: Partial<Site>) {
			requireAdmin();
			dispatch({ type: 'UPDATE_SITE', payload: { id, patch } });
		},
		removeSite(id: string) {
			requireAdmin();
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
			requireAdmin();
			dispatch({ type: 'UPDATE_SITE', payload: { id, patch: { pinned } } });
		},
		addCategory(input: CategoryInput, order = 0) {
			requireAdmin();
			const now = Date.now();
			const cat: Category = { id: nanoid(), ...input, order, createdAt: now, updatedAt: now };
			dispatch({ type: 'ADD_CATEGORY', payload: cat });
			return cat;
		},
		updateCategory(id: string, patch: Partial<Category>) {
			requireAdmin();
			dispatch({ type: 'UPDATE_CATEGORY', payload: { id, patch } });
		},
		removeCategory(id: string, migrateTo?: string) {
			requireAdmin();
			dispatch({ type: 'REMOVE_CATEGORY', payload: { id, migrateTo } });
		},
		reorderCategories(ids: string[]) {
			requireAdmin();
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
