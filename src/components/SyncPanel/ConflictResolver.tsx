import { useState } from 'preact/hooks';
import type { Site, Category } from '@/types';
import type { Conflict } from '@/services/sync/merger';
import type { SyncOutcome } from '@/services/sync/scheduler';
import { Modal } from '../Modal/Modal';
import './ConflictResolver.css';

type Choice = 'local' | 'remote' | 'skip';

interface Props {
  outcome: SyncOutcome;
  categories: Category[];
  onCancel: () => void;
  onResolve: (
    outcome: SyncOutcome,
    siteResolutions: Map<string, Choice>,
    catResolutions: Map<string, Choice>,
  ) => Promise<void>;
}

export function ConflictResolver({ outcome, categories, onCancel, onResolve }: Props) {
  const initSite = new Map<string, Choice>(outcome.conflicts.sites.map(c => [c.id, c.suggestion]));
  const initCat = new Map<string, Choice>(outcome.conflicts.categories.map(c => [c.id, c.suggestion]));

  const [siteRes, setSiteRes] = useState<Map<string, Choice>>(initSite);
  const [catRes, setCatRes] = useState<Map<string, Choice>>(initCat);

  const setSite = (id: string, v: Choice) => {
    const m = new Map(siteRes); m.set(id, v); setSiteRes(m);
  };
  const setCat = (id: string, v: Choice) => {
    const m = new Map(catRes); m.set(id, v); setCatRes(m);
  };
  const setAll = (kind: 'site' | 'cat', v: Choice) => {
    if (kind === 'site') {
      const m = new Map<string, Choice>();
      outcome.conflicts.sites.forEach(c => m.set(c.id, v));
      setSiteRes(m);
    } else {
      const m = new Map<string, Choice>();
      outcome.conflicts.categories.forEach(c => m.set(c.id, v));
      setCatRes(m);
    }
  };

  const catNameOf = (id: string) => categories.find(c => c.id === id)?.name ?? '?';
  const totalConflicts = outcome.conflicts.sites.length + outcome.conflicts.categories.length;

  return (
    <Modal open={true} title={`发现 ${totalConflicts} 个冲突`} onClose={onCancel} width={720}
      footer={
        <>
          <button class="btn btn-ghost" onClick={onCancel}>取消同步</button>
          <button class="btn btn-primary" onClick={() => onResolve(outcome, siteRes, catRes)}>应用并上传</button>
        </>
      }>
      <div class="conflict-resolver">
        <div class="conflict-hint">
          💡 请为每个冲突选择保留的版本，未标记的按建议（黄色）处理。
        </div>

        {outcome.conflicts.categories.length > 0 && (
          <section class="conflict-section">
            <div class="section-title">
              分类冲突（{outcome.conflicts.categories.length}）
              <div class="bulk-ops">
                <button onClick={() => setAll('cat', 'local')}>全选本地</button>
                <button onClick={() => setAll('cat', 'remote')}>全选云端</button>
              </div>
            </div>
            {outcome.conflicts.categories.map(c => (
              <ConflictRow key={c.id} conflict={c} choice={catRes.get(c.id)!} onChange={v => setCat(c.id, v)}
                renderItem={i => i ? `${i.icon ?? '📁'} ${i.name}` : '(已删除)'} />
            ))}
          </section>
        )}

        {outcome.conflicts.sites.length > 0 && (
          <section class="conflict-section">
            <div class="section-title">
              网址冲突（{outcome.conflicts.sites.length}）
              <div class="bulk-ops">
                <button onClick={() => setAll('site', 'local')}>全选本地</button>
                <button onClick={() => setAll('site', 'remote')}>全选云端</button>
              </div>
            </div>
            {outcome.conflicts.sites.map(c => (
              <ConflictRow key={c.id} conflict={c} choice={siteRes.get(c.id)!} onChange={v => setSite(c.id, v)}
                renderItem={i => i ? (
                  <>
                    <div><b>{i.name}</b></div>
                    <div class="c-url">{i.url}</div>
                    <div class="c-meta">
                      分类：{catNameOf(i.categoryId)}
                      {i.description && <> · {i.description.slice(0, 40)}</>}
                    </div>
                  </>
                ) : '(已删除)'} />
            ))}
          </section>
        )}
      </div>
    </Modal>
  );
}

function ConflictRow<T extends { updatedAt?: number }>({
  conflict, choice, onChange, renderItem,
}: {
  conflict: Conflict<T>;
  choice: Choice;
  onChange: (v: Choice) => void;
  renderItem: (i: T | null) => any;
}) {
  const opts: Array<{ v: Choice; label: string; item: T | null; hint?: string }> = [
    { v: 'local', label: '本地', item: conflict.local, hint: conflict.local?.updatedAt ? fmtTime(conflict.local.updatedAt) : '' },
    { v: 'remote', label: '云端', item: conflict.remote, hint: conflict.remote?.updatedAt ? fmtTime(conflict.remote.updatedAt) : '' },
  ];

  return (
    <div class="conflict-row">
      <div class="conflict-cards">
        {opts.map(o => (
          <label key={o.v}
            class={`conflict-card ${choice === o.v ? 'chosen' : ''} ${conflict.suggestion === o.v ? 'suggested' : ''}`}
            onClick={() => onChange(o.v)}>
            <div class="card-head">
              <input type="radio" checked={choice === o.v} onChange={() => onChange(o.v)} />
              <span>{o.label}</span>
              {conflict.suggestion === o.v && <span class="badge">建议</span>}
              {o.hint && <span class="time">{o.hint}</span>}
            </div>
            <div class="card-item">{renderItem(o.item)}</div>
          </label>
        ))}
      </div>
      <button class={`skip-btn ${choice === 'skip' ? 'active' : ''}`} onClick={() => onChange('skip')}>
        🗑 跳过（删除此条）
      </button>
    </div>
  );
}

function fmtTime(t: number) {
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}