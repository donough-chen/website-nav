import { useRef, useState, useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

interface Props {
  minHeight?: number;
  eager?: boolean; // 首屏之上强制立即渲染
  children: ComponentChildren;
}

/** 使用 content-visibility 优化，进入视口才详细渲染 */
export function LazySection({ minHeight = 200, eager, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(!!eager);

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

  return (
    <div ref={ref} style={rendered ? undefined : { minHeight, contentVisibility: 'auto' }}>
      {rendered ? children : null}
    </div>
  );
}