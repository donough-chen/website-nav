import { useApp } from '@/store/context';
import { useAuth } from '@/hooks/useAuth';
import { useAutoFetchPublic, usePublicRefresh } from '@/hooks/usePublicSource';
import './EmptyState.css';

interface Props {
  onOpenSetup: () => void;
  onOpenSync: () => void;
}

export function EmptyState({ onOpenSync }: Props) {
  const { state } = useApp();
  const { isGuest, isOpen, isAdmin } = useAuth();
  const config = state.publicSourceConfig;
  const { status, errorMsg } = useAutoFetchPublic();
  const { refresh, refreshing } = usePublicRefresh();

  if (state.sites.length > 0) return null;

  // 访客拉取中/失败
  if (isGuest) {
    if (status === 'fetching') {
      return <div class="empty-state loading"><div class="es-icon">⏳</div><div class="es-title">正在加载公开数据...</div></div>;
    }
    if (status === 'error') {
      return (
        <div class="empty-state error">
          <div class="es-icon">⚠</div>
          <div class="es-title">无法加载数据</div>
          <div class="es-desc">{errorMsg || '网络异常'}</div>
          <button class="btn btn-primary" onClick={refresh} disabled={refreshing}>
            {refreshing ? '重试中...' : '🔄 重试'}
          </button>
        </div>
      );
    }
    return (
      <div class="empty-state">
        <div class="es-icon">📭</div>
        <div class="es-title">暂无内容</div>
        <div class="es-desc">当前公开数据源无数据</div>
      </div>
    );
  }

  // Open / Admin 空数据
  return (
    <div class="empty-state">
      <div class="es-icon">🚀</div>
      <div class="es-title">开始构建你的导航</div>
      <div class="es-desc">点击「+ 新增」添加第一个网址</div>
      <div class="es-tips">
        <div class="es-tip">💡 支持批量导入 JSON / Excel / CSV</div>
        {isAdmin && <div class="es-tip">💡 可通过云同步跨设备使用</div>}
        {isAdmin && <div class="es-tip">💡 发布到公开 Gist 分享给他人</div>}
      </div>
      {isAdmin && (
        <div class="es-actions">
          <button class="btn btn-ghost" onClick={onOpenSync}>☁ 从云端恢复</button>
        </div>
      )}
    </div>
  );
}