import { useEffect } from 'preact/hooks';
import { useApp } from '@/store/context';

export function useTheme() {
  const { state } = useApp();
  useEffect(() => {
    const apply = () => {
      const theme = state.settings.theme;
      const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    if (state.settings.theme === 'auto') {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [state.settings.theme]);
}