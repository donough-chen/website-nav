import { useState, useEffect } from 'preact/hooks';
import type { Site, SiteInput } from '@/types';
import { useApp, useActions } from '@/store/context';
import { isValidUrl, ensureProtocol } from '@/utils/url';
import { Modal } from '../Modal/Modal';
import { useAuth } from '@/hooks/useAuth';
import { isBuiltInCategory } from '@/constants/builtInCategories';
import './SiteForm.css';

interface Props {
  open: boolean;
  site?: Site | null;
  defaultCategoryId?: string;
  onClose: () => void;
}

export function SiteForm({ open, site, defaultCategoryId, onClose }: Props) {
  const { canEdit } = useAuth();
  const { state, dispatch } = useApp();
  const actions = useActions();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');

  // categories 下拉源
  const selectableCategories = state.categories.filter(c => !isBuiltInCategory(c.id));

  if (open && !canEdit) {
    return (
      <Modal open={open} title="添加网址" onClose={onClose} width={480}>
        <div style={{ padding: 30, textAlign: 'center' }}>
          <div style={{ fontSize: 32 }}>🔒</div>
          <div>此功能需要管理员权限</div>
        </div>
      </Modal>
    );
  }

  useEffect(() => {
    if (!open) return;
    if (site) {
      setName(site.name);
      setUrl(site.url);
      setIcon(site.icon ?? '');
      setDescription(site.description ?? '');
      setRating(site.rating ?? 0);
      setTags((site.tags ?? []).join(', '));
      setCategoryId(site.categoryId);
    } else {
      setName(''); setUrl(''); setIcon(''); setDescription('');
      setRating(0); setTags('');
      setCategoryId(defaultCategoryId ?? state.categories[0]?.id ?? '');
    }
    setError('');
  }, [open, site, defaultCategoryId]);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!name.trim()) { setError('请输入名称'); return; }
    const finalUrl = ensureProtocol(url);
    if (!isValidUrl(finalUrl)) { setError('URL 格式不正确'); return; }
    if (!categoryId) { setError('请选择分类'); return; }

    const input: SiteInput = {
      name: name.trim(),
      url: finalUrl,
      icon: icon.trim() || undefined,
      description: description.trim() || undefined,
      rating: rating || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      categoryId,
    };

    if (site) actions.updateSite(site.id, input);
    else actions.addSite(input);
    onClose();
  };

  return (
    <Modal open={open} title={site ? '编辑网址' : '新增网址'} onClose={onClose}
      footer={
        <>
          <button class="btn btn-ghost" onClick={onClose}>取消</button>
          <button class="btn btn-primary" onClick={handleSubmit}>{site ? '保存' : '添加'}</button>
        </>
      }>
      <form class="site-form" onSubmit={handleSubmit}>
        {error && <div class="form-error">{error}</div>}
        <label>
          <span>名称 *</span>
          <input type="text" value={name} onInput={e => setName((e.target as HTMLInputElement).value)} required />
        </label>
        <label>
          <span>网址 *</span>
          <input type="text" placeholder="https://example.com" value={url}
            onInput={e => setUrl((e.target as HTMLInputElement).value)} required />
        </label>
        <label>
          <span>分类 *</span>
          <select value={categoryId} onChange={e => setCategoryId((e.target as HTMLSelectElement).value)}>
            {selectableCategories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>图标 URL（可选）</span>
          <input type="text" placeholder="留空则自动获取" value={icon}
            onInput={e => setIcon((e.target as HTMLInputElement).value)} />
        </label>
        <label>
          <span>描述（可选）</span>
          <textarea rows={2} value={description} maxLength={200}
            onInput={e => setDescription((e.target as HTMLTextAreaElement).value)} />
        </label>
        <label>
          <span>标签（用逗号分隔）</span>
          <input type="text" placeholder="工具, 代码" value={tags}
            onInput={e => setTags((e.target as HTMLInputElement).value)} />
        </label>
        <label>
          <span>评分：{rating > 0 ? '★'.repeat(rating) : '无'}</span>
          <div class="rating-picker">
            {[0, 1, 2, 3, 4, 5].map(n => (
              <button type="button" key={n}
                class={`rating-btn ${rating === n ? 'active' : ''}`}
                onClick={() => setRating(n)}>{n === 0 ? '无' : n}</button>
            ))}
          </div>
        </label>
      </form>
    </Modal>
  );
}