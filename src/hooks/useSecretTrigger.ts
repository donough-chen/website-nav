import { useCallback, useRef } from 'preact/hooks';

interface Options {
  count: number;
  windowMs: number;
  onTrigger: () => void;
}

/**
 * 隐蔽触发器：在 windowMs 时间窗口内累计 count 次调用即触发。
 * 无任何视觉反馈，仅调用 onTrigger。
 */
export function useSecretTrigger({ count, windowMs, onTrigger }: Options) {
  const clicks = useRef<number[]>([]);
  const timer = useRef<number | undefined>();

  const trigger = useCallback(() => {
    const now = Date.now();
    // 过滤过期点击
    clicks.current = [...clicks.current.filter(t => now - t < windowMs), now];

    if (clicks.current.length >= count) {
      clicks.current = [];
      if (timer.current) clearTimeout(timer.current);
      onTrigger();
      return;
    }

    // 到期自动清理
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const t = Date.now();
      clicks.current = clicks.current.filter(x => t - x < windowMs);
    }, windowMs + 50);
  }, [count, windowMs, onTrigger]);

  return trigger;
}