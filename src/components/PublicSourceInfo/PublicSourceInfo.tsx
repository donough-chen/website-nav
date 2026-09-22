import { useApp } from '@/store/context';
import { useAuth } from '@/hooks/useAuth';
import { usePublicRefresh } from '@/hooks/usePublicSource';
import './PublicSourceInfo.css';

export function PublicSourceInfo() {
  const { state } = useApp();
  const { isAdmin } = useAuth();
  const config = state.publicSourceConfig;
  const { refresh, refreshing } = usePublicRefresh();

  // Admin 或无数据源时不显示
  if (isAdmin || !config.gistId) return null;

  const timeText = config.lastFetchedAt ? formatRelative(config.lastFetchedAt) : '从未';
  const gistUrl = `https://gist.github.com/${config.gistId}`;

  return (
    <div class="public-source-info">
      {config.ownerAvatar && (
        <img src={config.ownerAvatar} alt="" class="psi-avatar" />
      )}
      {config.ownerLogin && (
        <a href={`https://github.com/${config.ownerLogin}`} target="_blank" rel="noreferrer" class="psi-owner">
          @{config.ownerLogin}
        </a>
      )}
      <span class="psi-sep">·</span>
      <span class="psi-time" title={new Date(config.lastFetchedAt ?? 0).toLocaleString()}>
        {timeText}
      </span>
      <button class="psi-refresh" onClick={refresh} disabled={refreshing}
        title="刷新数据">
        {refreshing ? '⏳' : '🔄'}
      </button>
      <a href={gistUrl} target="_blank" rel="noreferrer" class="psi-source" title="查看源数据">🔗</a>
    </div>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}