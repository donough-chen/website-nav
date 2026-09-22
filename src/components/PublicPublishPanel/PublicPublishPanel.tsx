import { useMemo, useState } from 'preact/hooks';
import { useApp } from '@/store/context';
import { publicSource } from '@/services/publicSource';
import { masterPassword } from '@/services/masterPassword';
import { copyToClipboard } from '@/services/share';
import { toast } from '@/utils/toast';
import './PublicPublishPanel.css';

export function PublicPublishPanel() {
  const { state, dispatch } = useApp();
  const config = state.publicSourceConfig;
  const [publishing, setPublishing] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    state.sites.forEach(s => (s.tags ?? []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [state.sites]);

  const excludedTags = config.excludeTags ?? [];
  const excludedCount = state.sites.filter(s =>
    (s.tags ?? []).some(t => excludedTags.includes(t))
  ).length;
  const willPublishCount = state.sites.length - excludedCount;

  const canPublish = state.syncConfig.enabled &&
    state.syncConfig.provider === 'gist' &&
    !!state.syncConfig.encrypted;

  const publish = async () => {
    if (!canPublish) {
      toast.error('请先在云同步中配置 GitHub Token');
      return;
    }
    if (!masterPassword.isUnlocked()) {
      toast.error('主密码未解锁，请重新解锁管理员');
      return;
    }

    setPublishing(true);
    try {
      const credStr = await masterPassword.decryptData(state.syncConfig.encrypted!);
      const cred = JSON.parse(credStr);
      if (!cred.token) throw new Error('GitHub Token 不可用');

      const payload = publicSource.buildPayload(state.sites, state.categories, excludedTags);
      const gistId = await publicSource.publish(payload, cred.token, config.gistId);

      dispatch({
        type: 'UPDATE_PUBLIC_SOURCE_CONFIG',
        payload: { gistId, lastPublishedAt: Date.now(), sourceHint: 'local' },
      });
      toast.success(`✅ 已发布 ${willPublishCount} 条数据`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  const copyShareLink = async () => {
    if (!config.gistId) return;
    const link = publicSource.buildShareUrl(config.gistId);
    const ok = await copyToClipboard(link);
    ok ? toast.success('链接已复制') : toast.error('复制失败');
  };

  const copyGistId = async () => {
    if (!config.gistId) return;
    const ok = await copyToClipboard(config.gistId);
    ok ? toast.success('Gist ID 已复制') : toast.error('复制失败');
  };

  const unpublish = async () => {
    if (!config.gistId) return;
    if (!confirm('确定取消发布？这将删除公开 Gist，访客将无法拉取数据。')) return;
    if (!masterPassword.isUnlocked()) { toast.error('主密码未解锁'); return; }

    try {
      const cred = JSON.parse(await masterPassword.decryptData(state.syncConfig.encrypted!));
      await publicSource.unpublish(config.gistId, cred.token);
      dispatch({
        type: 'UPDATE_PUBLIC_SOURCE_CONFIG',
        payload: { gistId: undefined, lastPublishedAt: undefined, lastEtag: undefined },
      });
      toast.success('已取消发布');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const toggleTag = (tag: string) => {
    const next = excludedTags.includes(tag)
      ? excludedTags.filter(t => t !== tag)
      : [...excludedTags, tag];
    dispatch({ type: 'UPDATE_PUBLIC_SOURCE_CONFIG', payload: { excludeTags: next } });
  };

  return (
    <div class="publish-panel">
      <div class="pp-warn">
        ⚠ 公开发布内容任何人可查看，请确保不含私人网址与敏感信息
      </div>

      {config.gistId ? (
        <div class="pp-status success">
          <div class="pp-status-row">
            <span>✅ 已发布</span>
            {config.lastPublishedAt && (
              <span class="pp-time">
                {formatRelative(config.lastPublishedAt)}
              </span>
            )}
          </div>
          <div class="pp-gist-info">
            <span class="pp-label">Gist ID:</span>
            <code class="pp-gist-id">{config.gistId}</code>
            <button class="btn-tiny" onClick={copyGistId} title="复制 ID">📋</button>
            <a class="btn-tiny" href={`https://gist.github.com/${config.gistId}`} target="_blank" rel="noreferrer" title="在 GitHub 查看">🔗</a>
          </div>
        </div>
      ) : (
        <div class="pp-status">
          <div class="pp-status-row">
            <span>⚪ 尚未发布</span>
          </div>
        </div>
      )}

      <div class="pp-form">
        <div class="pp-row">
          <div class="pp-info">
            <div><b>{willPublishCount}</b> 条将发布 · {excludedCount > 0 && <span class="pp-excluded">{excludedCount} 条已排除</span>}</div>
          </div>
        </div>

        <div class="pp-row">
          <button class="btn btn-primary" onClick={publish} disabled={publishing || !canPublish}>
            {publishing ? '发布中...' : (config.gistId ? '🔄 更新发布' : '🚀 立即发布')}
          </button>
          {config.gistId && (
            <>
              <button class="btn btn-ghost" onClick={copyShareLink}>🔗 复制分享链接</button>
              <button class="btn btn-danger" onClick={unpublish}>🗑 取消发布</button>
            </>
          )}
        </div>

        {!canPublish && (
          <div class="pp-hint">💡 发布需要在「云同步」中配置 GitHub Token（需 gist 权限）</div>
        )}

        <label class="pp-checkbox">
          <input type="checkbox"
            checked={config.autoPublish ?? false}
            onChange={e => dispatch({
              type: 'UPDATE_PUBLIC_SOURCE_CONFIG',
              payload: { autoPublish: (e.target as HTMLInputElement).checked },
            })}
          />
          <span>数据变更后自动发布（60 秒防抖）</span>
        </label>

        <div class="pp-tags-section">
          <div class="pp-tags-header">
            <span>排除标签（打上以下标签的网址不发布）</span>
            <button class="btn-link" onClick={() => setShowTagPicker(!showTagPicker)}>
              {showTagPicker ? '收起' : `管理（已排除 ${excludedTags.length}）`}
            </button>
          </div>
          {showTagPicker && (
            <div class="pp-tag-picker">
              {allTags.length === 0 ? (
                <div class="pp-hint">暂无标签</div>
              ) : allTags.map(t => (
                <button key={t}
                  class={`pp-tag ${excludedTags.includes(t) ? 'excluded' : ''}`}
                  onClick={() => toggleTag(t)}>
                  {excludedTags.includes(t) ? '🚫 ' : ''}{t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
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