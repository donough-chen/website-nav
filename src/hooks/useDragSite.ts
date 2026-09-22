import { useCallback } from 'preact/hooks';

let currentDragSiteId: string | null = null;

export function getDragSiteId() { return currentDragSiteId; }

export function useDragSite(siteId: string) {
  return {
    draggable: true,
    onDragStart: useCallback((e: DragEvent) => {
      currentDragSiteId = siteId;
      e.dataTransfer!.effectAllowed = 'move';
      e.dataTransfer!.setData('text/plain', siteId);
      (e.currentTarget as HTMLElement).classList.add('dragging');
    }, [siteId]),
    onDragEnd: useCallback((e: DragEvent) => {
      currentDragSiteId = null;
      (e.currentTarget as HTMLElement).classList.remove('dragging');
    }, []),
  };
}