import { useState, useCallback } from 'preact/hooks';

export function useDragSort<T extends { id: string }>(
  items: T[],
  onReorder: (ids: string[]) => void,
) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const bind = useCallback((id: string) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      setDragId(id);
      e.dataTransfer!.effectAllowed = 'move';
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      if (id !== dragId) setOverId(id);
    },
    onDragLeave: () => {
      if (overId === id) setOverId(null);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      if (!dragId || dragId === id) return;
      const ids = items.map(i => i.id);
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(id);
      if (from < 0 || to < 0) return;
      ids.splice(to, 0, ...ids.splice(from, 1));
      onReorder(ids);
      setDragId(null);
      setOverId(null);
    },
    onDragEnd: () => { setDragId(null); setOverId(null); },
    'data-dragging': dragId === id,
    'data-drag-over': overId === id,
  }), [items, dragId, overId, onReorder]);

  return { bind };
}