import type { Category } from '@/types';
import { useDropCategory } from '@/hooks/useDropCategory';

interface Props {
  category: Category;
  count: number;
  active: boolean;
  canEdit: boolean;
  dragBind: Record<string, any>;
  onSelect: () => void;
}

export function SidebarItem({ category, count, active, canEdit, dragBind, onSelect }: Props) {
  const dropBind = canEdit ? useDropCategory(category.id) : {};
  return (
    <button
      class={`sidebar-item ${active ? 'active' : ''}`}
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