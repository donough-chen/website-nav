import { useEffect, useRef, useState } from 'preact/hooks';
import './BackToTop.css';

const SCROLL_CONTAINER = '.main-content';

/** 一键回到顶部的悬浮球，已渲染列表内容超过一屏高度时显示 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const lastVisible = useRef(false);

  useEffect(() => {
    const container = document.querySelector<HTMLElement>(SCROLL_CONTAINER);
    if (!container) return;

    // 内容高度超过可视高度（即可滚动）且页面已向上滑动（scrollTop > 0）才显示
    const update = () => {
      const shouldShow = container.scrollHeight > container.clientHeight && container.scrollTop > 0;
      if (shouldShow !== lastVisible.current) {
        lastVisible.current = shouldShow;
        setVisible(shouldShow);
      }
    };

    update();

    // 页面滚动位置变化
    container.addEventListener('scroll', update, { passive: true });

    // 窗口尺寸变化（clientHeight 变化）
    window.addEventListener('resize', update);

    // 容器自身尺寸变化（如侧边栏收起/展开影响布局）
    const ro = new ResizeObserver(update);
    ro.observe(container);

    // 内容 DOM 变化（站点增删、分类懒加载渲染等，scrollHeight 变化）
    const mo = new MutationObserver(update);
    mo.observe(container, { childList: true, subtree: true });

    return () => {
      container.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  const scrollToTop = () => {
    document.querySelector<HTMLElement>(SCROLL_CONTAINER)?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button class="back-to-top" onClick={scrollToTop} aria-label="回到顶部" title="回到顶部">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
