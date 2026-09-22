import { useState, useEffect } from 'preact/hooks';
import { useApp, useActions } from '@/store/context';
import { Modal } from '../Modal/Modal';
import { useAuth } from '@/hooks/useAuth';
import './CategoryForm.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CategoryManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useApp();
  const actions = useActions(); // 从原 dispatch 改为 useActions
  const { canEdit } = useAuth();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [editingId, setEditingId] = useState<string | null>(null);

  // 若访客意外打开，直接关闭
  if (open && !canEdit) {
    return (
      <Modal open={open} title="分类管理" onClose={onClose} width={480}>
        <div class="perm-guard" style={{ padding: 30 }}>
          <div style={{ fontSize: 32 }}>🔒</div>
          <div>此功能需要管理员权限</div>
        </div>
      </Modal>
    );
  }

  useEffect(() => { if (!open) { setName(''); setIcon('📁'); setEditingId(null); } }, [open]);

  const cats = [...state.categories].sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    if (!name.trim()) return;
    if (editingId) {
      actions.updateCategory(editingId, { name: name.trim(), icon });
    } else {
      const maxOrder = Math.max(-1, ...cats.map(c => c.order));
      actions.addCategory({ name: name.trim(), icon }, maxOrder + 1);
    }
    setName(''); setIcon('📁'); setEditingId(null);
  };

  const handleEdit = (id: string) => {
    const c = cats.find(x => x.id === id);
    if (!c) return;
    setName(c.name); setIcon(c.icon ?? '📁'); setEditingId(id);
  };

  const handleDelete = (id: string) => {
    const siteCount = state.sites.filter(s => s.categoryId === id).length;
    const others = cats.filter(c => c.id !== id);
    if (siteCount === 0) {
      if (confirm('确定删除该分类？')) actions.removeCategory(id);
      return;
    }
    if (others.length === 0) {
      alert('无法删除唯一的分类，请先创建其他分类');
      return;
    }
    const opts = others.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
    const choice = prompt(`该分类下有 ${siteCount} 个网址，请选择迁移到：\n${opts}\n\n输入序号（留空则删除所有网址）`);
    if (choice === null) return;
    if (choice.trim() === '') {
      if (confirm(`将删除 ${siteCount} 个网址，确定？`)) actions.removeCategory(id);
    } else {
      const idx = parseInt(choice) - 1;
      const target = others[idx];
      if (!target) { alert('无效选择'); return; }
      actions.removeCategory(id, target.id);
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    const newList = [...cats];
    const t = idx + dir;
    if (t < 0 || t >= newList.length) return;
    [newList[idx], newList[t]] = [newList[t], newList[idx]];
    actions.reorderCategories(newList.map(c => c.id));
  };

  return (
    <Modal open={open} title="分类管理" onClose={onClose} width={520}>
      <div class="cat-manager">
        <div class="cat-add">
          <input class="icon-input" value={icon} onInput={e => setIcon((e.target as HTMLInputElement).value)} placeholder="📁" maxLength={2} />
          <input class="name-input" value={name} onInput={e => setName((e.target as HTMLInputElement).value)}
            placeholder={editingId ? '编辑分类名称' : '新分类名称'}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
          <button class="btn btn-primary" onClick={handleAdd}>{editingId ? '保存' : '添加'}</button>
          {editingId && <button class="btn btn-ghost" onClick={() => { setEditingId(null); setName(''); setIcon('📁'); }}>取消</button>}
        </div>
        <div class="cat-list">
          {cats.map((c, i) => (
            <div class="cat-row" key={c.id}>
              <span class="cat-icon">{c.icon || '📁'}</span>
              <span class="cat-name">{c.name}</span>
              <span class="cat-count">{state.sites.filter(s => s.categoryId === c.id).length}</span>
              <div class="cat-ops">
                <button class="icon-btn" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button class="icon-btn" onClick={() => move(i, 1)} disabled={i === cats.length - 1}>↓</button>
                <button class="icon-btn" onClick={() => handleEdit(c.id)}>✏</button>
                <button class="icon-btn danger" onClick={() => handleDelete(c.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}