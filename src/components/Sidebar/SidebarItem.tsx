import type { Category } from '@/types';
import { useDropCategory } from '@/hooks/useDropCategory';

interface Props {
  category: Category;
  count: number;
  active: boolean;
  canEdit: boolean;
  builtin?: boolean;
  dragBind: Record<string, any>;
  onSelect: () => void;
}

export function SidebarItem({ category, count, active, canEdit, builtin, dragBind, onSelect }: Props) {
  // 始终调用 hook，通过条件决定是否启用
  const dropBindings = useDropCategory(category.id);
  const dropBind = (canEdit && !builtin) ? dropBindings : {};

  return (
    <button
      class={`sidebar-item ${active ? 'active' : ''} ${builtin ? 'builtin' : ''}`}
      onClick={onSelect}
      {...dragBind}
      {...dropBind}
    >
      <span class="cat-icon">{category.icon || '📁'}</span>
      <span class="cat-name">{category.name}</span>
      <span class="cat-count">{count}</span>
    </button>
  );
}