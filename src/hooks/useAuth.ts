import { useApp } from '@/store/context';

export function useAuth() {
  const { state } = useApp();
  // auth.mode：会话鉴权，'admin' 表示已通过密码解锁
  // appMode：持久化基础模式（open/guest，null 表示首次访问未选择）
  const authMode = state.auth.mode;
  const appMode = state.appMode;

  const isAdmin = authMode === 'admin';
  const isOpen = !isAdmin && appMode === 'open';
  const isGuest = !isAdmin && appMode === 'guest';
  const uninitialized = appMode === null && !isAdmin;
  const mode = isAdmin ? 'admin' : appMode;
  const hasPassword = state.authConfig.hasPassword;

  return {
    mode,
    uninitialized,
    isGuest,
    isOpen,
    isAdmin,
    hasPassword,
    // 权限颗粒度
    canEditLocal: isOpen || isAdmin,   // 本地网址+分类编辑
    canSync: isAdmin,                  // 云同步
    canPublish: isAdmin,               // 公开发布
    canFavorite: true,                 // 所有模式可收藏
    // 兼容旧代码
    canEdit: isOpen || isAdmin,
    sessionExpireAt: state.auth.sessionExpireAt,
  };
}