import { useApp } from '@/store/context';
import { useAuth } from '@/hooks/useAuth';
import { useAutoFetchPublic, usePublicRefresh } from '@/hooks/usePublicSource';
import './EmptyState.css';

interface Props {
  onOpenSetup: () => void;
  onOpenSync: () => void;
}

export function EmptyState({ onOpenSetup, onOpenSync }: Props) {
  const { state } = useApp();
  const { isAdmin, isOpen, isGuest } = useAuth();
  const config = state.publicSourceConfig;
  const { status, errorMsg } = useAutoFetchPublic();
  const { refresh, refreshing } = usePublicRefresh();

  if (state.sites.length > 0) return null;

  // 拉取中
  if (!isAdmin && config.gistId && status === 'fetching') {
    return (
      <div class="empty-state loading">
        <div class="es-icon">⏳</div>
        <div class="es-title">正在加载数据...</div>
      </div>
    );
  }

  // 拉取失败
  if (!isAdmin && config.gistId && status === 'error') {
    return (
      <div class="empty-state error">
        <div class="es-icon">⚠</div>
        <div class="es-title">无法加载数据</div>
        <div class="es-desc">{errorMsg || '网络异常或数据源不可用'}</div>
        <button class="btn btn-primary" onClick={refresh} disabled={refreshing}>
          {refreshing ? '重试中...' : '🔄 重试'}
        </button>
      </div>
    );
  }

  // 访客且无数据源
  if (isGuest && !config.gistId) {
    return (
      <div class="empty-state">
        <div class="es-icon">📭</div>
        <div class="es-title">该导航暂无内容</div>
        <div class="es-desc">管理员尚未发布数据</div>
      </div>
    );
  }

  // Admin 无数据
  if (isAdmin) {
    return (
      <div class="empty-state">
        <div class="es-icon">🚀</div>
        <div class="es-title">开始构建你的导航</div>
        <div class="es-desc">点击「+ 新增」添加第一个网址</div>
        <div class="es-tips">
          <div class="es-tip">💡 支持批量导入 JSON / Excel / CSV</div>
          <div class="es-tip">💡 可通过云同步跨设备使用</div>
          <div class="es-tip">💡 发布到公开 Gist 分享给他人</div>
        </div>
        <div class="es-actions">
          <button class="btn btn-ghost" onClick={onOpenSync}>☁ 从云端恢复</button>
        </div>
      </div>
    );
  }

  // Open 模式无数据（引导设置密码）
  if (isOpen) {
    return (
      <div class="empty-state">
        <div class="es-icon">👋</div>
        <div class="es-title">欢迎</div>
        <div class="es-desc">点击「+ 新增」添加网址，或设置密码启用只读保护</div>
        <div class="es-actions">
          <button class="btn btn-ghost" onClick={onOpenSetup}>🔐 设置密码</button>
        </div>
      </div>
    );
  }

  return null;
}