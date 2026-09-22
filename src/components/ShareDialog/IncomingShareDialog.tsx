import { useState } from 'preact/hooks';
import type { Site } from '@/types';
import { useApp } from '@/store/context';
import { Modal } from '../Modal/Modal';
import './ShareDialog.css';

interface Props {
  data: Partial<Site>;
  onClose: () => void;
  onConfirm: (categoryId: string) => void;
}

export function IncomingShareDialog({ data, onClose, onConfirm }: Props) {
  const { state } = useApp();
  const [catId, setCatId] = useState(state.categories[0]?.id ?? '');

  return (
    <Modal open={true} title="收到分享" onClose={onClose} width={420}
      footer={
        <>
          <button class="btn btn-ghost" onClick={onClose}>忽略</button>
          <button class="btn btn-primary" onClick={() => onConfirm(catId)} disabled={!catId}>添加到收藏</button>
        </>
      }>
      <div class="incoming-share">
        <div class="share-preview">
          <div class="share-name">{data.name}</div>
          <div class="share-url">{data.url}</div>
          {data.description && <div class="share-desc">{data.description}</div>}
          {data.tags && data.tags.length > 0 && (
            <div class="share-tags">
              {data.tags.map(t => <span key={t} class="tag">{t}</span>)}
            </div>
          )}
        </div>
        <div class="incoming-form">
          <label>
            <span>添加到分类</span>
            <select value={catId} onChange={e => setCatId((e.target as HTMLSelectElement).value)}>
              {state.categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </label>
        </div>
      </div>
    </Modal>
  );
}