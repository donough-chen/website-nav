import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import './VirtualGrid.css';

interface Props<T> {
  items: T[];
  itemHeight: number;
  minItemWidth: number;
  gap: number;
  overscan?: number;
  renderItem: (item: T, index: number) => ComponentChildren;
  keyExtractor: (item: T) => string;
}

export function VirtualGrid<T>({
  items, itemHeight, minItemWidth, gap, overscan = 3, renderItem, keyExtractor,
}: Props<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(600);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const scroller = el.closest('.main-content') as HTMLElement | null;
    if (!scroller) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const scRect = scroller.getBoundingClientRect();
      setScrollTop(Math.max(0, scRect.top - rect.top));
      setViewport(scroller.clientHeight);
      setContainerWidth(el.clientWidth);
    };
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      scroller.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  const columns = Math.max(1, Math.floor((containerWidth + gap) / (minItemWidth + gap)));
  const cellWidth = columns > 0 ? (containerWidth - (columns - 1) * gap) / columns : minItemWidth;
  const rowHeight = itemHeight + gap;
  const totalRows = Math.ceil(items.length / columns);
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewport) / rowHeight) + overscan);

  const visible = useMemo(() => {
    const list: Array<{ item: T; index: number; row: number; col: number }> = [];
    for (let r = startRow; r < endRow; r++) {
      for (let c = 0; c < columns; c++) {
        const idx = r * columns + c;
        if (idx >= items.length) break;
        list.push({ item: items[idx], index: idx, row: r, col: c });
      }
    }
    return list;
  }, [items, startRow, endRow, columns]);

  return (
    <div ref={containerRef} class="vgrid" style={{ height: totalRows * rowHeight - gap }}>
      {visible.map(({ item, index, row, col }) => (
        <div key={keyExtractor(item)}
          class="vgrid-cell"
          style={{
            transform: `translate(${col * (cellWidth + gap)}px, ${row * rowHeight}px)`,
            width: cellWidth,
            height: itemHeight,
          }}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}