import { useEffect, useState } from 'preact/hooks';

interface PWAUpdate {
  needRefresh: boolean;
  offlineReady: boolean;
  update: () => Promise<void>;
  dismiss: () => void;
}

export function usePWAUpdate(): PWAUpdate {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    // 动态导入 vite-plugin-pwa 的注册模块（生产才有）
    import('virtual:pwa-register').then(({ registerSW }) => {
      const fn = registerSW({
        immediate: true,
        onNeedRefresh() { setNeedRefresh(true); },
        onOfflineReady() {
          setOfflineReady(true);
          setTimeout(() => setOfflineReady(false), 3000);
        },
      });
      setUpdateSW(() => fn);
    }).catch(() => { /* dev 环境忽略 */ });
  }, []);

  return {
    needRefresh,
    offlineReady,
    update: async () => { if (updateSW) await updateSW(true); },
    dismiss: () => setNeedRefresh(false),
  };
}