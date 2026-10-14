import { useRef, useState, useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

interface Props {
  minHeight?: number;
  eager?: boolean; // 首屏之上强制立即渲染
  forceRender?: boolean; // 外部主动要求渲染（如点击侧边栏/搜索定位时）
  children: ComponentChildren;
}

/** 使用 content-visibility 优化，进入视口才详细渲染；forceRender 时立即渲染以便定位跳转 */
export function LazySection({ minHeight = 200, eager, forceRender, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(!!eager);

  const visible = rendered || forceRender;

  useEffect(() => {
    if (visible) return;
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
  }, [visible]);

  return (
    <div ref={ref} style={visible ? undefined : { minHeight, contentVisibility: 'auto' }}>
      {visible ? children : null}
    </div>
  );
}