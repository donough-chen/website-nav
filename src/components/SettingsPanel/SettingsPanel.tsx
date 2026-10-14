import { useState } from 'preact/hooks';
import { useApp, useActions } from '@/store/context';
import { useAuth } from '@/hooks/useAuth';
import { Modal } from '../Modal/Modal';
import { exportAsJson, exportAsExcel } from '@/services/exporter';
import { authService } from '@/services/authService';
import { toast } from '@/utils/toast';
import type { Settings, AppMode } from '@/types';
import { PublicPublishPanel } from '../PublicPublishPanel/PublicPublishPanel';
import './SettingsPanel.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenImport: () => void;
  onOpenSync: () => void;
  onOpenStats: () => void;
  onExportEncrypted: () => void;
}

const IDLE_OPTIONS = [
  { v: 0, label: '永不' },
  { v: 5, label: '5 分钟' },
  { v: 15, label: '15 分钟' },
  { v: 30, label: '30 分钟' },
  { v: 60, label: '1 小时' },
];

export function SettingsPanel({
  open, onClose, onOpenImport, onOpenSync, onOpenStats, onExportEncrypted,
}: Props) {
  const { state, dispatch } = useApp();
  const actions = useActions();
  const auth = useAuth();
  const [tab, setTab] = useState<'general' | 'data' | 'about'>('general');

  const upd = (patch: Partial<Settings>) =>
    dispatch({ type: 'UPDATE_SETTINGS', payload: patch });

  const switchMode = (target: AppMode) => {
    if (target === 'admin') return; // admin 不允许直接切
    if (target === auth.mode) return;

    if (target === 'guest' && auth.isOpen && state.sites.length > 0) {
      if (!confirm('切换到访客模式后，本地数据将暂时隐藏（不会删除），是否继续？')) return;
    }
    dispatch({ type: 'SET_APP_MODE', payload: target });
    toast.success(target === 'guest' ? '已切换到访客模式' : '已切换到开放模式');
  };

  const handleLock = () => {
    authService.lock();
    dispatch({ type: 'SET_AUTH_MODE', payload: { mode: state.appMode ?? 'open' } });
    toast.info('🔒 已锁定');
    onClose();
  };

  return (
    <Modal open={open} title="设置" onClose={onClose} width={580}>
      <div class="settings">
        {/* ========== 顶部身份区 ========== */}
        <div class="settings-identity">
          {auth.isAdmin && (
            <>
              <div class="identity-info">
                <span class="identity-icon">👑</span>
                <div>
                  <div class="identity-title">管理员模式</div>
                  <div class="identity-desc">
                    {auth.sessionExpireAt
                      ? `会话至 ${new Date(auth.sessionExpireAt).toLocaleTimeString()}`
                      : '仅限当前页面生命周期'}
                  </div>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" onClick={handleLock}>🔒 立即锁定</button>
            </>
          )}
          {auth.isOpen && (
            <>
              <div class="identity-info">
                <span class="identity-icon">🔓</span>
                <div>
                  <div class="identity-title">开放模式</div>
                  <div class="identity-desc">本地数据管理，可导入导出与分享</div>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" onClick={() => switchMode('guest')}>
                👁 切换到访客
              </button>
            </>
          )}
          {auth.isGuest && (
            <>
              <div class="identity-info">
                <span class="identity-icon">👁</span>
                <div>
                  <div class="identity-title">访客模式</div>
                  <div class="identity-desc">浏览公开数据源，只读</div>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" onClick={() => switchMode('open')}>
                🔓 切换到开放模式
              </button>
            </>
          )}
        </div>

        {/* ========== Tab 切换 ========== */}
        <div class="settings-tabs">
          <button class={tab === 'general' ? 'active' : ''} onClick={() => setTab('general')}>常规</button>
          <button class={tab === 'data' ? 'active' : ''} onClick={() => setTab('data')}>数据</button>
          <button class={tab === 'about' ? 'active' : ''} onClick={() => setTab('about')}>关于</button>
        </div>

        {/* ========== 常规 ========== */}
        {tab === 'general' && (
          <div class="settings-section">
            <SettingRow label="主题">
              <select value={state.settings.theme}
                onChange={e => upd({ theme: (e.target as HTMLSelectElement).value as any })}>
                <option value="auto">跟随系统</option>
                <option value="light">明亮</option>
                <option value="dark">暗黑</option>
              </select>
            </SettingRow>
            <SettingRow label="布局">
              <select value={state.settings.layout}
                onChange={e => upd({ layout: (e.target as HTMLSelectElement).value as any })}>
                <option value="card">卡片</option>
                <option value="list">列表</option>
                <option value="compact">紧凑</option>
              </select>
            </SettingRow>
            <SettingRow label="排序">
              <select value={state.settings.sortBy}
                onChange={e => upd({ sortBy: (e.target as HTMLSelectElement).value as any })}>
                <option value="default">默认（置顶优先）</option>
                <option value="name">按名称</option>
                <option value="visits">按访问次数</option>
                <option value="rating">按评分</option>
              </select>
            </SettingRow>
            <SettingRow label="显示评分">
              <Switch checked={state.settings.showRating}
                onChange={v => upd({ showRating: v })} />
            </SettingRow>
            <SettingRow label="显示描述">
              <Switch checked={state.settings.showDescription}
                onChange={v => upd({ showDescription: v })} />
            </SettingRow>
            <SettingRow label="图标源">
              <select value={state.settings.faviconSource}
                onChange={e => upd({ faviconSource: (e.target as HTMLSelectElement).value as any })}>
                <option value="google">Google</option>
                <option value="duckduckgo">DuckDuckGo</option>
                <option value="custom">自定义</option>
              </select>
            </SettingRow>
            {state.settings.faviconSource === 'custom' && (
              <SettingRow label="自定义图标 URL">
                <input type="text" placeholder="{domain} 会被替换"
                  value={state.settings.customFaviconUrl ?? ''}
                  onInput={e => upd({ customFaviconUrl: (e.target as HTMLInputElement).value })} />
              </SettingRow>
            )}
          </div>
        )}

        {/* ========== 数据 ========== */}
        {tab === 'data' && (
          <div class="settings-section">
            {auth.isGuest ? (
              <GuestDataHint />
            ) : (
              <>
                {/* 本地数据操作：open + admin 可用 */}
                <div class="settings-group">
                  <div class="group-title">导入 / 导出</div>
                  <div class="group-body">
                    <button class="btn btn-ghost" onClick={onOpenImport}>📥 批量导入</button>
                    <button class="btn btn-ghost"
                      onClick={() => exportAsJson(state.sites, state.categories)}>
                      📤 导出为 JSON
                    </button>
                    <button class="btn btn-ghost"
                      onClick={() => exportAsExcel(state.sites, state.categories)}>
                      📊 导出为 Excel
                    </button>
                    <button class="btn btn-ghost" onClick={onExportEncrypted}>
                      🔐 导出加密备份
                    </button>
                  </div>
                </div>

                {/* 高级功能：仅 admin */}
                {auth.canSync && (
                  <div class="settings-group">
                    <div class="group-title">云端同步</div>
                    <div class="group-body">
                      <button class="btn btn-ghost" onClick={onOpenSync}>☁ 配置云同步</button>
                      <div class="text-hint">支持 GitHub Gist / WebDAV，凭证加密存储</div>
                    </div>
                  </div>
                )}

                {auth.canPublish && (
                  <div class="settings-group">
                    <div class="group-title">🌐 公开发布</div>
                    <div class="group-body">
                      <PublicPublishPanel />
                    </div>
                  </div>
                )}

                {/* 会话配置：仅 admin */}
                {auth.isAdmin && (
                  <div class="settings-group">
                    <div class="group-title">会话</div>
                    <div class="group-body">
                      <SettingRow label="空闲自动锁定">
                        <select value={state.authConfig.idleTimeoutMin}
                          onChange={e => dispatch({
                            type: 'UPDATE_AUTH_CONFIG',
                            payload: { idleTimeoutMin: Number((e.target as HTMLSelectElement).value) }
                          })}>
                          {IDLE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                        </select>
                      </SettingRow>
                    </div>
                  </div>
                )}

                {/* 危险操作：open + admin */}
                <div class="settings-group">
                  <div class="group-title">危险操作</div>
                  <div class="group-body">
                    <button class="btn btn-danger" onClick={() => {
                      if (confirm('确定清除所有本地数据？此操作不可恢复！')) {
                        authService.emergencyReset();
                      }
                    }}>🗑 清除全部数据</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========== 关于 ========== */}
        {tab === 'about' && (
          <div class="settings-section about">
            <h3>Nav - 网址导航</h3>
            <p>一个纯前端的个人网址分类聚合导航平台。</p>
            <div class="about-stats">
              <div><b>{state.sites.length}</b> 个网址</div>
              <div><b>{state.categories.length}</b> 个分类</div>
              <div><b>{state.sites.reduce((s, x) => s + (x.visitCount ?? 0), 0)}</b> 次访问</div>
            </div>
            <button class="btn btn-ghost" onClick={onOpenStats}>📊 查看详细统计</button>
            <div class="text-hint kbd-hints">
              <b>快捷键：</b><br />
              Ctrl+K — 搜索<br />
              Ctrl+Shift+A — 新增网址<br />
              ESC — 关闭弹窗
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function GuestDataHint() {
  return (
    <div class="guest-data-hint">
      <div class="gdh-icon">👁</div>
      <div class="gdh-title">访客模式无数据管理权限</div>
      <div class="gdh-desc">当前数据来自公开数据源，切换到「开放模式」即可管理自己的本地数据</div>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: any }) {
  return (
    <div class="setting-row">
      <span class="setting-label">{label}</span>
      <div class="setting-control">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label class={`switch ${checked ? 'on' : ''}`}>
      <input type="checkbox" checked={checked}
        onChange={e => onChange((e.target as HTMLInputElement).checked)} />
      <span class="switch-slider" />
    </label>
  );
}