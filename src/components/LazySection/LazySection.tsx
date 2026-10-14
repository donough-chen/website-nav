import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

interface Props {
  minHeight?: number;
  eager?: boolean; // 首屏之上强制立即渲染
  forceRender?: boolean; // 定位跳转时强制渲染（并保持），确保 DOM 完整
  children: ComponentChildren;
}

/** 进入视口才详细渲染；forceRender 时立即渲染以支持精确定位跳转 */
export function LazySection({ minHeight = 200, eager, forceRender, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(!!eager || !!forceRender);

  // forceRender 变为 true 时立即渲染，并永久保持（一旦渲染就不再折叠）
  useEffect(() => {
    if (forceRender) setRendered(true);
  }, [forceRender]);

  useEffect(() => {
    if (rendered) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRendered(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: '400px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rendered]);

  return <div ref={ref}>{rendered ? children : <div style={{ minHeight }} />}</div>;
}
