import { useState, useEffect } from 'preact/hooks';
import { useApp } from '@/store/context';
import { Modal } from '../Modal/Modal';
import { GistAdapter } from '@/services/sync/gist';
import { WebDAVAdapter } from '@/services/sync/webdav';
import { syncScheduler } from '@/services/sync/scheduler';
import { masterPassword } from '@/services/masterPassword';
import { toast } from '@/utils/toast';
import { ConflictResolver } from './ConflictResolver';
import type { SyncOutcome } from '@/services/sync/scheduler';
import type { Conflict } from '@/services/sync/merger';
import { useAuth } from '@/hooks/useAuth';
import type { Site, Category } from '@/types';
import './SyncPanel.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SyncPanel({ open, onClose }: Props) {
  const { canEdit } = useAuth();
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<'config' | 'action'>(state.syncConfig.enabled ? 'action' : 'config');

  const [provider, setProvider] = useState<'gist' | 'webdav'>(state.syncConfig.provider);
  const [token, setToken] = useState('');
  const [gistId, setGistId] = useState(state.syncConfig.gistId ?? '');
  const [wdUrl, setWdUrl] = useState('');
  const [wdUser, setWdUser] = useState('');
  const [wdPass, setWdPass] = useState('');
  const [wdPath, setWdPath] = useState('/nav-data.json');
  const [autoSync, setAutoSync] = useState(state.syncConfig.autoSync);

  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingOutcome, setPendingOutcome] = useState<SyncOutcome | null>(null);

  if (open && !canEdit) {
    return (
      <Modal open={open} title="云端同步" onClose={onClose} width={560}>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🔒</div>
          <div style={{ marginTop: 12 }}>云同步为管理员功能</div>
        </div>
      </Modal>
    );
  }

  useEffect(() => {
    if (open && state.syncConfig.enabled && state.syncConfig.encrypted && masterPassword.isUnlocked()) {
      masterPassword.decryptData(state.syncConfig.encrypted).then(str => {
        try {
          const c = JSON.parse(str);
          if (state.syncConfig.provider === 'gist') {
            setToken(c.token ?? '');
            setGistId(c.gistId ?? state.syncConfig.gistId ?? '');
          } else {
            setWdUrl(c.baseUrl ?? '');
            setWdUser(c.username ?? '');
            setWdPass(c.password ?? '');
            setWdPath(c.filePath ?? '/nav-data.json');
          }
        } catch {}
      });
    }
  }, [open]);

  const buildAdapter = () => {
    if (provider === 'gist') {
      if (!token) { toast.error('请填写 Token'); return null; }
      return new GistAdapter({ token, gistId: gistId || undefined });
    } else {
      if (!wdUrl || !wdUser) { toast.error('请填写 URL 与用户名'); return null; }
      return new WebDAVAdapter({ baseUrl: wdUrl, username: wdUser, password: wdPass, filePath: wdPath });
    }
  };

  const handleTest = async () => {
    const adapter = buildAdapter();
    if (!adapter) return;
    setTesting(true);
    try {
      const ok = await adapter.test();
      ok ? toast.success('连接成功！') : toast.error('连接失败，请检查凭证');
    } catch (e) {
      toast.error('连接失败：' + (e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    const adapter = buildAdapter();
    if (!adapter) return;
    if (!masterPassword.isUnlocked()) {
      toast.warning('请先解锁主密码（设置 → 主密码）');
      return;
    }
    const creds = provider === 'gist'
      ? { token, gistId }
      : { baseUrl: wdUrl, username: wdUser, password: wdPass, filePath: wdPath };
    const encrypted = await masterPassword.encryptData(JSON.stringify(creds));

    dispatch({
      type: 'UPDATE_SYNC_CONFIG',
      payload: { enabled: true, provider, encrypted, autoSync, gistId: gistId || undefined },
    });
    syncScheduler.setAdapter(adapter);
    toast.success('已保存云同步配置');
    setTab('action');
  };

  const handleDisable = () => {
    if (!confirm('确定关闭云同步？（本地数据保留，云端数据不删除）')) return;
    dispatch({ type: 'UPDATE_SYNC_CONFIG', payload: { enabled: false, encrypted: undefined } });
    syncScheduler.setAdapter(null);
    toast.info('已关闭云同步');
    setTab('config');
  };

  const runSync = async () => {
    if (!syncScheduler.hasAdapter()) {
      const adapter = buildAdapter();
      if (adapter) syncScheduler.setAdapter(adapter);
      else return;
    }
    setSyncing(true);
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
    try {
      const outcome = await syncScheduler.prepareSync({
        sites: state.sites,
        categories: state.categories,
        tombstones: state.tombstones,
      });

      const hasConflict = outcome.conflicts.sites.length > 0 || outcome.conflicts.categories.length > 0;
      if (hasConflict) {
        setPendingOutcome(outcome);
      } else {
        await applyOutcome(outcome, new Map(), new Map());
      }
    } catch (e) {
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      toast.error('同步失败：' + (e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const applyOutcome = async (
    outcome: SyncOutcome,
    siteResolutions: Map<string, 'local' | 'remote' | 'skip'>,
    catResolutions: Map<string, 'local' | 'remote' | 'skip'>,
  ) => {
    const { applyConflictResolutions } = await import('@/services/sync/merger');
    const siteRes = applyConflictResolutions(outcome.mergedData.sites, outcome.conflicts.sites, siteResolutions);
    const catRes = applyConflictResolutions(outcome.mergedData.categories, outcome.conflicts.categories, catResolutions);

    dispatch({
      type: 'REPLACE_ALL',
      payload: {
        sites: siteRes.merged as Site[],
        categories: catRes.merged as Category[],
        tombstones: outcome.mergedData.tombstones,
      },
    });
    await syncScheduler.pushOnly({
      sites: siteRes.merged as Site[],
      categories: catRes.merged as Category[],
      tombstones: outcome.mergedData.tombstones,
    });
    dispatch({ type: 'UPDATE_SYNC_CONFIG', payload: { lastSyncAt: Date.now() } });
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'success' });
    toast.success(`同步完成`);
    setPendingOutcome(null);
  };

  const handleUploadOnly = async () => {
    if (!confirm('将本地数据覆盖到云端？')) return;
    setSyncing(true);
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
    try {
      await syncScheduler.pushOnly({
        sites: state.sites, categories: state.categories, tombstones: state.tombstones,
      });
      dispatch({ type: 'UPDATE_SYNC_CONFIG', payload: { lastSyncAt: Date.now() } });
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'success' });
      toast.success('上传成功');
    } catch (e) {
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      toast.error('上传失败：' + (e as Error).message);
    } finally { setSyncing(false); }
  };

  const handleDownloadOnly = async () => {
    if (!confirm('将云端数据覆盖到本地？本地未同步的数据会丢失！')) return;
    setSyncing(true);
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
    try {
      const cloud = await syncScheduler.pullOnly();
      if (!cloud) { toast.warning('云端无数据'); return; }
      dispatch({
        type: 'REPLACE_ALL',
        payload: { sites: cloud.sites, categories: cloud.categories, tombstones: cloud.tombstones ?? [] },
      });
      dispatch({ type: 'UPDATE_SYNC_CONFIG', payload: { lastSyncAt: Date.now() } });
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'success' });
      toast.success('已从云端拉取');
    } catch (e) {
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      toast.error('拉取失败：' + (e as Error).message);
    } finally { setSyncing(false); }
  };

  return (
    <>
      <Modal open={open && !pendingOutcome} title="云端同步" onClose={onClose} width={560}>
        <div class="sync-panel">
          <div class="settings-tabs">
            <button class={tab === 'config' ? 'active' : ''} onClick={() => setTab('config')}>配置</button>
            <button class={tab === 'action' ? 'active' : ''} onClick={() => setTab('action')} disabled={!state.syncConfig.enabled}>操作</button>
          </div>

          {tab === 'config' && (
            <div class="sync-config">
              {!masterPassword.isUnlocked() && (
                <div class="warn-banner">⚠ 请先在「设置 → 主密码」中解锁主密码后配置云同步</div>
              )}
              <div class="setting-row">
                <span class="setting-label">同步方式</span>
                <select value={provider} onChange={e => setProvider((e.target as HTMLSelectElement).value as any)}>
                  <option value="gist">GitHub Gist</option>
                  <option value="webdav">WebDAV</option>
                </select>
              </div>

              {provider === 'gist' ? (
                <>
                  <div class="setting-row col">
                    <span class="setting-label">Personal Access Token（需 gist 权限）</span>
                    <input type="password" value={token} onInput={e => setToken((e.target as HTMLInputElement).value)}
                      placeholder="ghp_xxxxxxxx" />
                  </div>
                  <div class="setting-row col">
                    <span class="setting-label">Gist ID（留空则自动创建）</span>
                    <input type="text" value={gistId} onInput={e => setGistId((e.target as HTMLInputElement).value)} />
                  </div>
                  <div class="hint-box">
                    <a href="https://github.com/settings/tokens/new?scopes=gist&description=Nav%20Hub" target="_blank">🔗 前往 GitHub 创建 Token</a>
                  </div>
                </>
              ) : (
                <>
                  <div class="setting-row col">
                    <span class="setting-label">服务器地址</span>
                    <input type="text" placeholder="https://dav.jianguoyun.com/dav/" value={wdUrl}
                      onInput={e => setWdUrl((e.target as HTMLInputElement).value)} />
                  </div>
                  <div class="setting-row col">
                    <span class="setting-label">用户名</span>
                    <input type="text" value={wdUser} onInput={e => setWdUser((e.target as HTMLInputElement).value)} />
                  </div>
                  <div class="setting-row col">
                    <span class="setting-label">密码 / 应用密码</span>
                    <input type="password" value={wdPass} onInput={e => setWdPass((e.target as HTMLInputElement).value)} />
                  </div>
                  <div class="setting-row col">
                    <span class="setting-label">文件路径</span>
                    <input type="text" value={wdPath} onInput={e => setWdPath((e.target as HTMLInputElement).value)} />
                  </div>
                  <div class="hint-box">💡 坚果云等服务需在应用管理中生成「应用密码」使用</div>
                </>
              )}

              <div class="setting-row">
                <span class="setting-label">自动同步（数据变更 30 秒后自动上传）</span>
                <label class={`switch ${autoSync ? 'on' : ''}`}>
                  <input type="checkbox" checked={autoSync} onChange={e => setAutoSync((e.target as HTMLInputElement).checked)} />
                  <span class="switch-slider" />
                </label>
              </div>

              <div class="btn-group">
                <button class="btn btn-ghost" onClick={handleTest} disabled={testing}>
                  {testing ? '测试中...' : '测试连接'}
                </button>
                <button class="btn btn-primary" onClick={handleSave} disabled={!masterPassword.isUnlocked()}>保存配置</button>
                {state.syncConfig.enabled && <button class="btn btn-danger" onClick={handleDisable}>关闭同步</button>}
              </div>
            </div>
          )}

          {tab === 'action' && (
            <div class="sync-actions">
              <div class="sync-status-box">
                <div>
                  <div class="status-label">状态：<b>{state.syncStatus === 'idle' ? '就绪' : state.syncStatus === 'syncing' ? '同步中' : state.syncStatus === 'success' ? '已同步' : '失败'}</b></div>
                  {state.syncConfig.lastSyncAt && (
                    <div class="text-hint">上次同步：{new Date(state.syncConfig.lastSyncAt).toLocaleString()}</div>
                  )}
                </div>
              </div>
              <div class="action-buttons">
                <button class="action-card" onClick={runSync} disabled={syncing}>
                  <div class="action-icon">🔄</div>
                  <div class="action-title">智能同步</div>
                  <div class="action-desc">合并双端数据（推荐）</div>
                </button>
                <button class="action-card" onClick={handleUploadOnly} disabled={syncing}>
                  <div class="action-icon">🔼</div>
                  <div class="action-title">上传</div>
                  <div class="action-desc">本地覆盖云端</div>
                </button>
                <button class="action-card" onClick={handleDownloadOnly} disabled={syncing}>
                  <div class="action-icon">🔽</div>
                  <div class="action-title">下载</div>
                  <div class="action-desc">云端覆盖本地</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {pendingOutcome && (
        <ConflictResolver
          outcome={pendingOutcome}
          categories={state.categories}
          onCancel={() => { setPendingOutcome(null); dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' }); }}
          onResolve={applyOutcome}
        />
      )}
    </>
  );
}