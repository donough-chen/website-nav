import { useEffect, useRef, useState } from 'preact/hooks';
import type { RefObject } from 'preact';

// 全局共享一个 IntersectionObserver，性能更好
let sharedObserver: IntersectionObserver | null = null;
const observedMap = new WeakMap<Element, (visible: boolean) => void>();

function getObserver(): IntersectionObserver {
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        const cb = observedMap.get(entry.target);
        if (cb) cb(entry.isIntersecting);
      }
    },
    { rootMargin: '200px 0px', threshold: 0.01 }
  );
  return sharedObserver;
}

/** 元素是否在视口附近 */
export function useInView<T extends Element>(ref: RefObject<T>): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (inView) return; // 一旦可见就不再观察

    const observer = getObserver();
    observedMap.set(el, (v) => {
      if (v) {
        setInView(true);
        observer.unobserve(el);
        observedMap.delete(el);
      }
    });
    observer.observe(el);

    return () => {
      observer.unobserve(el);
      observedMap.delete(el);
    };
  }, [inView]);

  return inView;
}