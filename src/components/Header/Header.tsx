import { useApp } from '@/store/context';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/useResponsive';
import { useSecretTrigger } from '@/hooks/useSecretTrigger';
import { AuthBadge } from '../AuthBadge/AuthBadge';
import { PublicSourceInfo } from '../PublicSourceInfo/PublicSourceInfo';
import logoUrl from '/assets/logo.svg';
import './Header.css';

interface Props {
  onSearch: () => void;
  onAdd: () => void;
  onSettings: () => void;
  onMenu: () => void;
  onRequestUnlock: () => void;
}

export function Header({ onSearch, onAdd, onSettings, onMenu, onRequestUnlock }: Props) {
  const { state } = useApp();
  const { canEdit, isGuest, isAdmin, hasPassword } = useAuth();
  const isMobile = useIsMobile();

  const secretClick = useSecretTrigger({
    count: 10,
    windowMs: 20_000,
    onTrigger: onRequestUnlock,
  });

  const handleLogoClick = () => {
    if (hasPassword && !isAdmin) secretClick();
  };

  const syncIcon = state.syncConfig.enabled
    ? { idle: '☁', syncing: '🔄', success: '✅', error: '⚠' }[state.syncStatus]
    : null;

  return (
    <header class="app-header">
      <div class="header-left">
        {isMobile && (
          <button class="icon-btn" onClick={onMenu} aria-label="菜单">☰</button>
        )}
        <div
          class={`logo ${isAdmin ? 'logo-admin' : ''}`}
          onClick={handleLogoClick}
          role="button"
          aria-label="Nav"
        >
          <img src={logoUrl} alt="Nav" class="logo-img" draggable={false} />
          {isAdmin && <span class="logo-lock" aria-hidden>🔓</span>}
        </div>
        {isAdmin && <AuthBadge />}
        <PublicSourceInfo />
      </div>

      <div class="header-center">
        <button class="search-trigger" onClick={onSearch}>
          <span class="search-icon">🔍</span>
          <span class="search-placeholder">搜索网址...</span>
          <kbd class="kbd">Ctrl+K</kbd>
        </button>
      </div>

      <div class="header-right">
        {syncIcon && canEdit && (
          <button class="icon-btn" onClick={onSettings} title={`同步状态：${state.syncStatus}`}>
            {syncIcon}
          </button>
        )}
        {canEdit && !isMobile && (
          <button class="btn btn-primary" onClick={onAdd}>+ 新增</button>
        )}
        {isGuest && (
          <span class="guest-tip" title="只读模式">👁</span>
        )}
        <button class="icon-btn" onClick={onSettings} aria-label="设置">⚙</button>
      </div>
    </header>
  );
}