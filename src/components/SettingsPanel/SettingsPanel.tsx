import { useState } from 'preact/hooks';
import { useApp } from '@/store/context';
import { useAuth } from '@/hooks/useAuth';
import { Modal } from '../Modal/Modal';
import { exportAsJson, exportAsExcel } from '@/services/exporter';
import { authService } from '@/services/authService';
import { toast } from '@/utils/toast';
import type { Settings, AuthConfig } from '@/types';
import { PublicPublishPanel } from '../PublicPublishPanel/PublicPublishPanel';
import './SettingsPanel.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenImport: () => void;
  onOpenSync: () => void;
  onOpenStats: () => void;
  onExportEncrypted: () => void;
  onSetupPassword: () => void;
  onChangePassword: () => void;
  onRequestUnlock: () => void;
}

const IDLE_OPTIONS = [
  { v: 0, label: '永不' },
  { v: 5, label: '5 分钟' },
  { v: 15, label: '15 分钟' },
  { v: 30, label: '30 分钟' },
  { v: 60, label: '1 小时' },
];

export function SettingsPanel({
  open, onClose, onOpenImport, onOpenSync, onOpenStats,
  onExportEncrypted, onSetupPassword, onChangePassword, onRequestUnlock,
}: Props) {
  const { state, dispatch } = useApp();
  const auth = useAuth();
  const [tab, setTab] = useState<'general' | 'security' | 'data' | 'about'>('general');

  const upd = (patch: Partial<Settings>) => dispatch({ type: 'UPDATE_SETTINGS', payload: patch });
  const updAuth = (patch: Partial<AuthConfig>) => dispatch({ type: 'UPDATE_AUTH_CONFIG', payload: patch });

  const handleLock = () => {
    authService.lock();
    dispatch({ type: 'SET_AUTH_MODE', payload: { mode: 'guest' } });
    toast.info('🔒 已锁定');
    onClose();
  };

  return (
    <Modal open={open} title="设置" onClose={onClose} width={580}>
      <div class="settings">
        {/* 顶部身份区 */}
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
          {auth.isGuest && (
            <>
              <div class="identity-info">
                <span class="identity-icon">👁</span>
                <div>
                  <div class="identity-title">访客模式（只读）</div>
                  <div class="identity-desc">部分功能已禁用，需解锁后使用</div>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" onClick={() => { onClose(); onRequestUnlock(); }}>
                🔓 解锁
              </button>
            </>
          )}
          {auth.isOpen && (
            <>
              <div class="identity-info">
                <span class="identity-icon">🔓</span>
                <div>
                  <div class="identity-title">开放模式</div>
                  <div class="identity-desc">未设置密码，任何人可编辑</div>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" onClick={onSetupPassword}>🔐 设置密码</button>
            </>
          )}
        </div>

        <div class="settings-tabs">
          <button class={tab === 'general' ? 'active' : ''} onClick={() => setTab('general')}>常规</button>
          <button class={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}>安全</button>
          <button class={tab === 'data' ? 'active' : ''} onClick={() => setTab('data')}>数据</button>
          <button class={tab === 'about' ? 'active' : ''} onClick={() => setTab('about')}>关于</button>
        </div>

        {/* 常规：全员可用 */}
        {tab === 'general' && (
          <div class="settings-section">
            <SettingRow label="主题">
              <select value={state.settings.theme} onChange={e => upd({ theme: (e.target as HTMLSelectElement).value as any })}>
                <option value="auto">跟随系统</option>
                <option value="light">明亮</option>
                <option value="dark">暗黑</option>
              </select>
            </SettingRow>
            <SettingRow label="布局">
              <select value={state.settings.layout} onChange={e => upd({ layout: (e.target as HTMLSelectElement).value as any })}>
                <option value="card">卡片</option>
                <option value="list">列表</option>
                <option value="compact">紧凑</option>
              </select>
            </SettingRow>
            <SettingRow label="排序">
              <select value={state.settings.sortBy} onChange={e => upd({ sortBy: (e.target as HTMLSelectElement).value as any })}>
                <option value="default">默认（置顶优先）</option>
                <option value="name">按名称</option>
                <option value="visits">按访问次数</option>
                <option value="rating">按评分</option>
              </select>
            </SettingRow>
            <SettingRow label="显示评分">
              <Switch checked={state.settings.showRating} onChange={v => upd({ showRating: v })} />
            </SettingRow>
            <SettingRow label="显示描述">
              <Switch checked={state.settings.showDescription} onChange={v => upd({ showDescription: v })} />
            </SettingRow>
            <SettingRow label="图标源">
              <select value={state.settings.faviconSource} onChange={e => upd({ faviconSource: (e.target as HTMLSelectElement).value as any })}>
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

        {/* 安全：涉及密码相关 */}
        {tab === 'security' && (
          <div class="settings-section">
            {!auth.hasPassword ? (
              <div class="settings-group">
                <div class="group-title">密码保护</div>
                <div class="group-body">
                  <div class="text-hint">
                    当前<b>未设置密码</b>，任何访问者都可编辑数据。
                    发布给他人访问前建议设置密码。
                  </div>
                  <button class="btn btn-primary" onClick={onSetupPassword}>🔐 设置密码</button>
                </div>
              </div>
            ) : (
              <>
                <div class="settings-group">
                  <div class="group-title">密码</div>
                  <div class="group-body">
                    <div class="text-hint">✅ 已设置密码</div>
                    {auth.isAdmin ? (
                      <button class="btn btn-ghost" onClick={onChangePassword}>✏ 修改密码</button>
                    ) : (
                      <div class="text-hint">解锁后可修改密码</div>
                    )}
                  </div>
                </div>

                {auth.isAdmin && (
                  <div class="settings-group">
                    <div class="group-title">会话</div>
                    <div class="group-body">
                      <SettingRow label="空闲自动锁定">
                        <select value={state.authConfig.idleTimeoutMin}
                          onChange={e => updAuth({ idleTimeoutMin: Number((e.target as HTMLSelectElement).value) })}>
                          {IDLE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                        </select>
                      </SettingRow>
                      <SettingRow label="默认记住时长">
                        <select value={state.authConfig.rememberDuration}
                          onChange={e => updAuth({ rememberDuration: Number((e.target as HTMLSelectElement).value) })}>
                          <option value={0}>不记住</option>
                          <option value={15}>15 分钟</option>
                          <option value={30}>30 分钟</option>
                          <option value={60}>1 小时</option>
                          <option value={240}>4 小时</option>
                        </select>
                      </SettingRow>
                    </div>
                  </div>
                )}
              </>
            )}

            <div class="settings-group">
              <div class="group-title">安全说明</div>
              <div class="group-body">
                <div class="text-hint">
                  💡 本方案为<b>前端 UI 层保护</b>，能阻止普通访问者的操作，但无法防御通过 DevTools 直接修改本地存储的用户。
                  高安全场景请配合后端使用。
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 数据：编辑相关操作，仅 admin/open 可用 */}
        {tab === 'data' && (
          <div class="settings-section">
            <PermissionGuard canEdit={auth.canEdit} onRequestUnlock={onRequestUnlock}>
              <div class="settings-group">
                <div class="group-title">导入 / 导出</div>
                <div class="group-body">
                  <button class="btn btn-ghost" onClick={onOpenImport}>📥 批量导入</button>
                  <button class="btn btn-ghost" onClick={() => exportAsJson(state.sites, state.categories)}>📤 导出为 JSON</button>
                  <button class="btn btn-ghost" onClick={() => exportAsExcel(state.sites, state.categories)}>📊 导出为 Excel</button>
                  <button class="btn btn-ghost" onClick={onExportEncrypted}>🔐 导出加密备份</button>
                </div>
              </div>
              <div class="settings-group">
                <div class="group-title">🌐 公开发布</div>
                <div class="group-body">
                  <PublicPublishPanel />
                </div>
              </div>
              <div class="settings-group">
                <div class="group-title">云端同步</div>
                <div class="group-body">
                  <button class="btn btn-ghost" onClick={onOpenSync}>☁ 配置云同步</button>
                  <div class="text-hint">支持 GitHub Gist / WebDAV，凭证加密存储</div>
                </div>
              </div>
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
            </PermissionGuard>
          </div>
        )}

        {tab === 'about' && (
          <div class="settings-section about">
            <h3>Nav - 网址导航</h3>
            <p>一个纯前端的个人网址分类聚合导航平台。</p>
            <div class="about-stats">
              <div><b>{state.sites.length}</b> 个网址</div>
              <div><b>{state.categories.length}</b> 个分类</div>
              <div><b>{state.sites.reduce((s, x) => s + (x.visitCount ?? 0), 0)}</b> 次访问</div>
            </div>
            <p class="text-hint">数据存储在本地浏览器，可选云端同步。</p>
            <p class="text-hint">技术栈：Preact + TypeScript + Vite</p>
            <div class="text-hint" style={{ marginTop: 12 }}>
              <b>快捷键：</b><br />
              Ctrl+K — 搜索<br />
              Ctrl+Shift+A — 新增网址<br />
              ESC — 关闭弹窗
            </div>
            <button class="btn btn-ghost" onClick={onOpenStats}>📊 查看详细统计</button>
          </div>
        )}
      </div>
    </Modal>
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
      <input type="checkbox" checked={checked} onChange={e => onChange((e.target as HTMLInputElement).checked)} />
      <span class="switch-slider" />
    </label>
  );
}

function PermissionGuard({ canEdit, onRequestUnlock, children }: {
  canEdit: boolean;
  onRequestUnlock: () => void;
  children: any;
}) {
  if (canEdit) return <>{children}</>;
  return (
    <div class="perm-guard">
      <div class="perm-guard-icon">🔒</div>
      <div class="perm-guard-title">此区域为管理员功能</div>
      <div class="perm-guard-desc">解锁管理员模式后可查看和使用</div>
      <button class="btn btn-primary" onClick={onRequestUnlock}>🔓 解锁管理员</button>
    </div>
  );
}