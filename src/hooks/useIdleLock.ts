import { useEffect, useRef } from 'preact/hooks';

/**
 * 空闲自动锁定：timeoutMin 分钟内无用户操作则调用 onLock
 * timeoutMin = 0 表示永不锁定
 */
export function useIdleLock(timeoutMin: number, enabled: boolean, onLock: () => void) {
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  useEffect(() => {
    if (!enabled || timeoutMin <= 0) return;
    let timer: number;
    const reset = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => onLockRef.current(), timeoutMin * 60_000);
    };
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [timeoutMin, enabled]);
}