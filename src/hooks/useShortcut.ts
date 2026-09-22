import { useEffect } from 'preact/hooks';

/**
 * 支持的键组合：
 *   'ctrl+k' / 'ctrl+shift+a' / 'alt+n' / 'meta+k' / 单键 'escape'
 * meta 对应 macOS 的 Command 键
 */
export function useShortcut(combo: string, handler: (e: KeyboardEvent) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const parts = combo.toLowerCase().split('+').map(s => s.trim());
    const key = parts[parts.length - 1];
    const needCtrl = parts.includes('ctrl');
    const needShift = parts.includes('shift');
    const needAlt = parts.includes('alt');
    const needMeta = parts.includes('meta');

    const onKey = (e: KeyboardEvent) => {
      // 输入框内不触发（除了 Escape）
      const target = e.target as HTMLElement;
      const inInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (inInput && key !== 'escape') return;

      if (e.key.toLowerCase() !== key) return;
      if (needCtrl !== (e.ctrlKey || e.metaKey)) return; // ctrl 同时匹配 mac 的 cmd
      if (needShift !== e.shiftKey) return;
      if (needAlt !== e.altKey) return;
      if (needMeta && !e.metaKey) return;

      e.preventDefault();
      handler(e);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo, enabled, handler]);
}