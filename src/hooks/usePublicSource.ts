import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '@/store/context';
import { useAuth } from './useAuth';
import { publicSource } from '@/services/publicSource';
import { toast } from '@/utils/toast';

/** 后台自动拉取公开数据源（仅访客/open 模式） */
export function useAutoFetchPublic() {
  const { state, dispatch } = useApp();
  const { isAdmin } = useAuth();
  const fetchedRef = useRef(false);
  const [status, setStatus] = useState<'idle' | 'fetching' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!state.loaded) return;
    if (isAdmin) return; // Admin 不自动拉取
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const resolved = publicSource.resolve(state.publicSourceConfig.gistId);
    if (!resolved) return;

    // 更新 sourceHint（若变化）
    if (
      resolved.id !== state.publicSourceConfig.gistId ||
      resolved.source !== state.publicSourceConfig.sourceHint
    ) {
      dispatch({
        type: 'UPDATE_PUBLIC_SOURCE_CONFIG',
        payload: { gistId: resolved.id, sourceHint: resolved.source },
      });
    }

    (async () => {
      setStatus('fetching');
      try {
        const result = await publicSource.fetch(
          resolved.id,
          state.publicSourceConfig.lastEtag
        );

        if (result.notModified) {
          setStatus('idle');
          return;
        }
        if (!result.data) return;

        dispatch({
          type: 'REPLACE_PUBLIC_DATA',
          payload: { sites: result.data.sites, categories: result.data.categories },
        });
        dispatch({
          type: 'UPDATE_PUBLIC_SOURCE_CONFIG',
          payload: {
            lastFetchedAt: Date.now(),
            lastEtag: result.etag,
            ownerLogin: result.ownerLogin,
            ownerAvatar: result.ownerAvatar,
          },
        });
        setStatus('idle');
      } catch (e) {
        console.warn('[PublicSource] auto fetch failed:', e);
        setErrorMsg((e as Error).message);
        setStatus('error');
      }
    })();
  }, [state.loaded, isAdmin]);

  return { status, errorMsg };
}

/** 手动刷新（返回可复用的 refresh 函数） */
export function usePublicRefresh() {
  const { state, dispatch } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    const gistId = state.publicSourceConfig.gistId;
    if (!gistId) {
      toast.error('未配置数据源');
      return;
    }
    setRefreshing(true);
    try {
      // 强制不带 etag（保证拉最新）
      const result = await publicSource.fetch(gistId);
      if (result.data) {
        dispatch({
          type: 'REPLACE_PUBLIC_DATA',
          payload: { sites: result.data.sites, categories: result.data.categories },
        });
        dispatch({
          type: 'UPDATE_PUBLIC_SOURCE_CONFIG',
          payload: {
            lastFetchedAt: Date.now(),
            lastEtag: result.etag,
            ownerLogin: result.ownerLogin,
            ownerAvatar: result.ownerAvatar,
          },
        });
        toast.success(`已更新（${result.data.sites.length} 条）`);
      } else {
        toast.info('数据已是最新');
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  };

  return { refresh, refreshing };
}