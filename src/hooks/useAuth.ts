import { useApp } from '@/store/context';

export function useAuth() {
  const { state } = useApp();
  const { mode } = state.auth;
  return {
    mode,
    isOpen: mode === 'open',
    isGuest: mode === 'guest',
    isAdmin: mode === 'admin',
    canEdit: mode === 'admin' || mode === 'open',
    hasPassword: state.authConfig.hasPassword,
    needsWelcome: mode === 'open' && !state.authConfig.hasPassword && !state.authConfig.welcomeDismissed,
    sessionExpireAt: state.auth.sessionExpireAt,
  };
}