import { useApp, useActions } from '@/store/context';
import { useIsMobile } from '@/hooks/useResponsive';
import { useDragSort } from '@/hooks/useDragSort';
import { useDropCategory } from '@/hooks/useDropCategory';
import { useAuth } from '@/hooks/useAuth';
import { SidebarItem } from './SidebarItem';
import './Sidebar.css';

interface Props {
  activeId?: string | null;
  onSelect: (id: string) => void;
  onManageCategories: () => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ activeId, onSelect, onManageCategories, open, onClose }: Props) {
  const { state } = useApp();
  const actions = useActions();
  const isMobile = useIsMobile();
  const { canEdit } = useAuth();
  const categories = [...state.categories].sort((a, b) => a.order - b.order);

  // 拖拽排序仅 admin 启用
  const { bind } = useDragSort(categories, ids => canEdit && actions.reorderCategories(ids));

  const content = (
    <aside class={`sidebar ${open ? 'open' : ''}`}>
      <div class="sidebar-title">分类</div>
      <nav class="sidebar-nav">
        {categories.map(cat => {
          const count = state.sites.filter(s => s.categoryId === cat.id).length;
          return (
            <SidebarItem
              key={cat.id}
              category={cat}
              count={count}
              active={activeId === cat.id}
              canEdit={canEdit}
              dragBind={canEdit && !isMobile ? bind(cat.id) : {}}
              onSelect={() => { onSelect(cat.id); if (isMobile) onClose(); }}
            />
          );
        })}
      </nav>
      {canEdit && (
        <button class="sidebar-manage" onClick={onManageCategories}>+ 管理分类</button>
      )}
    </aside>
  );

  if (isMobile) {
    return (
      <>
        {open && <div class="sidebar-mask" onClick={onClose} />}
        {content}
      </>
    );
  }
  return content;
}