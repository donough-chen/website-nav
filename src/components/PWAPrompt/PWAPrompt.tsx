import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import './PWAPrompt.css';

export function PWAPrompt() {
  const { needRefresh, offlineReady, update, dismiss } = usePWAUpdate();

  if (offlineReady) {
    return (
      <div class="pwa-prompt offline">
        <span>✅ 已可离线使用</span>
      </div>
    );
  }

  if (!needRefresh) return null;

  return (
    <div class="pwa-prompt update">
      <div class="pwa-content">
        <div class="pwa-title">🎉 发现新版本</div>
        <div class="pwa-desc">刷新以使用最新功能</div>
      </div>
      <div class="pwa-actions">
        <button class="btn btn-ghost" onClick={dismiss}>稍后</button>
        <button class="btn btn-primary" onClick={update}>立即刷新</button>
      </div>
    </div>
  );
}