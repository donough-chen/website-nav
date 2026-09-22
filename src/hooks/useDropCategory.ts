import { useState, useCallback } from 'preact/hooks';
import { useApp, useActions } from '@/store/context';
import { getDragSiteId } from './useDragSite';
import { toast } from '@/utils/toast';

export function useDropCategory(categoryId: string) {
  const { state, dispatch } = useApp();
  const actions = useActions();
  const [active, setActive] = useState(false);

  const onDragOver = useCallback((e: DragEvent) => {
    if (!getDragSiteId()) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    setActive(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    // 检查是否真正离开容器（避免子元素触发）
    const rt = e.relatedTarget as Node | null;
    if (rt && (e.currentTarget as Node).contains(rt)) return;
    setActive(false);
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setActive(false);
    const siteId = getDragSiteId();
    if (!siteId) return;
    const site = state.sites.find(s => s.id === siteId);
    if (!site || site.categoryId === categoryId) return;
    actions.updateSite(siteId, { categoryId });
    const catName = state.categories.find(c => c.id === categoryId)?.name ?? '';
    toast.success(`已移动到「${catName}」`);
  }, [categoryId, state.sites, state.categories]);

  return { onDragOver, onDragLeave, onDrop, 'data-drop-active': active };
}