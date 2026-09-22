import { useEffect } from 'preact/hooks';
import type { RefObject } from 'preact';
import { hapticFeedback } from '@/utils/device';

export interface GestureHandlers {
  onTap?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: (dist: number) => void;
  onSwipeRight?: (dist: number) => void;
  onSwipeUp?: (dist: number) => void;
  onSwipeDown?: (dist: number) => void;
}

export interface GestureOptions {
  longPressDelay?: number;
  swipeThreshold?: number;
}

export function useGesture<T extends HTMLElement>(
  ref: RefObject<T>,
  handlers: GestureHandlers,
  options: GestureOptions = {},
) {
  const { longPressDelay = 500, swipeThreshold = 50 } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0, startY = 0, startT = 0;
    let longTimer: number | undefined;
    let moved = false;

    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      moved = false;
      startT = Date.now();
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;

      if (handlers.onLongPress) {
        longTimer = window.setTimeout(() => {
          if (!moved) {
            hapticFeedback(20);
            handlers.onLongPress!();
          }
        }, longPressDelay);
      }
    };

    const move = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        moved = true;
        if (longTimer) { clearTimeout(longTimer); longTimer = undefined; }
      }
    };

    const end = (e: TouchEvent) => {
      if (longTimer) { clearTimeout(longTimer); longTimer = undefined; }
      const dt = Date.now() - startT;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const absX = Math.abs(dx), absY = Math.abs(dy);

      if (!moved && dt < 250 && handlers.onTap) {
        handlers.onTap();
        return;
      }
      if (Math.max(absX, absY) < swipeThreshold) return;

      if (absX > absY) {
        dx > 0 ? handlers.onSwipeRight?.(dx) : handlers.onSwipeLeft?.(-dx);
      } else {
        dy > 0 ? handlers.onSwipeDown?.(dy) : handlers.onSwipeUp?.(-dy);
      }
    };

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: true });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [ref, handlers.onTap, handlers.onLongPress, handlers.onSwipeLeft, handlers.onSwipeRight, handlers.onSwipeUp, handlers.onSwipeDown]);
}