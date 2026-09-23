import { useMemo } from 'preact/hooks';
import { useApp, useActions } from '@/store/context';
import { useIsMobile } from '@/hooks/useResponsive';
import { useDragSort } from '@/hooks/useDragSort';
import { useAuth } from '@/hooks/useAuth';
import { SidebarItem } from './SidebarItem';
import { BUILTIN_CATEGORIES, BUILTIN_CATEGORY, POPULAR_LIMIT } from '@/constants/builtInCategories';
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

  // ✅ 稳定引用，避免 useDragSort 内部反复初始化
  const userCategories = useMemo(
    () => [...state.categories].sort((a, b) => a.order - b.order),
    [state.categories]
  );

  // ✅ 始终注册拖拽 hook（内部通过 canEdit 决定是否响应）
  const { bind } = useDragSort(userCategories, ids => {
    if (canEdit) actions.reorderCategories(ids);
  });

  const getCount = (catId: string): number => {
    if (catId === BUILTIN_CATEGORY.POPULAR) {
      return Math.min(state.sites.filter(s => (s.visitCount ?? 0) > 0).length, POPULAR_LIMIT);
    }
    if (catId === BUILTIN_CATEGORY.FAVORITES) {
      return state.favorites.length;
    }
    return state.sites.filter(s => s.categoryId === catId).length;
  };

  const content = (
    <aside class={`sidebar ${open ? 'open' : ''}`}>
      <div class="sidebar-title">分类</div>
      <nav class="sidebar-nav">
        {/* 内置分类 */}
        {BUILTIN_CATEGORIES.map(cat => (
          <SidebarItem
            key={cat.id}
            category={cat}
            count={getCount(cat.id)}
            active={activeId === cat.id}
            canEdit={canEdit}
            builtin
            dragBind={{}}
            onSelect={() => { onSelect(cat.id); if (isMobile) onClose(); }}
          />
        ))}

        {userCategories.length > 0 && <div class="sidebar-divider" />}

        {/* 用户分类 */}
        {userCategories.map(cat => {
          // ✅ 始终调用 bind（返回事件处理器），条件仅决定是否 spread
          const bindings = bind(cat.id);
          return (
            <SidebarItem
              key={cat.id}
              category={cat}
              count={getCount(cat.id)}
              active={activeId === cat.id}
              canEdit={canEdit}
              dragBind={canEdit && !isMobile ? bindings : {}}
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