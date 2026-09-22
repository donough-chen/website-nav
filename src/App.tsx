import { useMemo, useState, useCallback, useEffect, useRef } from 'preact/hooks';
import { AppProvider, useApp, useActions } from './store/context';
import { useTheme } from './hooks/useTheme';
import { useShortcut } from './hooks/useShortcut';
import { useAuth } from './hooks/useAuth';
import { useIdleLock } from './hooks/useIdleLock';
import { Header } from './components/Header/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { SiteGrid } from './components/SiteGrid/SiteGrid';
import { SiteForm } from './components/SiteForm/SiteForm';
import { CategoryManager } from './components/CategoryForm/CategoryForm';
import { SearchPanel } from './components/SearchPanel/SearchPanel';
import { SettingsPanel } from './components/SettingsPanel/SettingsPanel';
import { ImportDialog } from './components/ImportDialog/ImportDialog';
import { SyncPanel } from './components/SyncPanel/SyncPanel';
import { StatsPanel } from './components/StatsPanel/StatsPanel';
import { TagBar } from './components/TagBar/TagBar';
import { ToastContainer } from './components/Toast/Toast';
import { PWAPrompt } from './components/PWAPrompt/PWAPrompt';
import { ShareDialog } from './components/ShareDialog/ShareDialog';
import { IncomingShareDialog } from './components/ShareDialog/IncomingShareDialog';
import { UnlockDialog } from './components/UnlockDialog/UnlockDialog';
import { PasswordSetupDialog } from './components/PasswordSetupDialog/PasswordSetupDialog';
import { WelcomeBanner } from './components/WelcomeBanner/WelcomeBanner';
import { PasswordPrompt } from './components/PasswordPrompt/PasswordPrompt';
import { LazySection } from './components/LazySection/LazySection';
import { EmptyState } from './components/EmptyState/EmptyState';
import { useAutoFetchPublic } from './hooks/usePublicSource';
import { publicSource } from './services/publicSource';
import { GistAdapter } from './services/sync/gist';
import { WebDAVAdapter } from './services/sync/webdav';
import { syncScheduler } from './services/sync/scheduler';
import { masterPassword } from './services/masterPassword';
import { authService } from './services/authService';
import { toast } from './utils/toast';
import type { Site } from './types';

function Main() {
  useTheme();
  const { state, dispatch } = useApp();
  const actions = useActions();
  const auth = useAuth();
  useAutoFetchPublic();

  const [siteFormOpen, setSiteFormOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [defaultCatId, setDefaultCatId] = useState<string | undefined>();
  const [catMgrOpen, setCatMgrOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [shareSite, setShareSite] = useState<Site | null>(null);
  const [incomingShare, setIncomingShare] = useState<Partial<Site> | null>(null);
  const [exportPwOpen, setExportPwOpen] = useState(false);

  // Auth 相关
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [pwSetupOpen, setPwSetupOpen] = useState(false);
  const [pwSetupMode, setPwSetupMode] = useState<'setup' | 'change'>('setup');

  // 权限守卫：受保护弹窗需要在解锁后才能打开
  const guardEditAction = useCallback((fn: () => void) => {
    if (auth.canEdit) fn();
    else { setUnlockOpen(true); toast.info('请先解锁管理员'); }
  }, [auth.canEdit]);

  const openAdd = useCallback((catId?: string) => {
    guardEditAction(() => {
      setEditingSite(null); setDefaultCatId(catId); setSiteFormOpen(true);
    });
  }, [guardEditAction]);

  const openEdit = useCallback((site: Site) => {
    guardEditAction(() => {
      setEditingSite(site); setSiteFormOpen(true);
    });
  }, [guardEditAction]);

  const openShare = useCallback((site: Site) => setShareSite(site), []);

  // 空闲自动锁定
  useIdleLock(state.authConfig.idleTimeoutMin, auth.isAdmin, () => {
    authService.lock();
    dispatch({ type: 'SET_AUTH_MODE', payload: { mode: 'guest' } });
    toast.info('🔒 空闲超时，已自动锁定');
  });

  // Admin 且开启 autoPublish 时，数据变更自动发布
  const autoPublishTimerRef = useRef<number | undefined>();
  useEffect(() => {
    if (!state.loaded || !auth.isAdmin) return;
    if (!state.publicSourceConfig.autoPublish) return;
    if (!state.publicSourceConfig.gistId) return;
    if (!state.syncConfig.encrypted || !masterPassword.isUnlocked()) return;

    if (autoPublishTimerRef.current) clearTimeout(autoPublishTimerRef.current);
    autoPublishTimerRef.current = window.setTimeout(async () => {
      try {
        const credStr = await masterPassword.decryptData(state.syncConfig.encrypted!);
        const cred = JSON.parse(credStr);
        const payload = publicSource.buildPayload(
          state.sites, state.categories,
          state.publicSourceConfig.excludeTags ?? []
        );
        await publicSource.publish(payload, cred.token, state.publicSourceConfig.gistId);
        dispatch({
          type: 'UPDATE_PUBLIC_SOURCE_CONFIG',
          payload: { lastPublishedAt: Date.now() },
        });
        toast.success('🌐 已自动发布');
      } catch (e) {
        console.warn('[AutoPublish] failed:', e);
      }
    }, 60_000);

    return () => { if (autoPublishTimerRef.current) clearTimeout(autoPublishTimerRef.current); };
  }, [state.sites, state.categories, state.publicSourceConfig.autoPublish]);

  // 会话到期自动锁定
  useEffect(() => {
    if (!auth.isAdmin || !auth.sessionExpireAt) return;
    const remaining = auth.sessionExpireAt - Date.now();
    if (remaining <= 0) {
      authService.lock();
      dispatch({ type: 'SET_AUTH_MODE', payload: { mode: 'guest' } });
      return;
    }
    const t = setTimeout(() => {
      authService.lock();
      dispatch({ type: 'SET_AUTH_MODE', payload: { mode: 'guest' } });
      toast.info('🔒 会话已过期');
    }, remaining);
    return () => clearTimeout(t);
  }, [auth.isAdmin, auth.sessionExpireAt]);

  // 快捷键：搜索全员可用；新增需权限
  useShortcut('ctrl+k', () => setSearchOpen(true));
  useShortcut('ctrl+shift+a', () => openAdd()); // Ctrl+Shift+A 新增（避免与浏览器 Ctrl+N 冲突）

  // 云同步 adapter 初始化（需 admin 且已解锁 masterPassword）
  useEffect(() => {
    if (!state.loaded) return;
    if (!auth.isAdmin) return;
    if (state.syncConfig.enabled && state.syncConfig.encrypted && masterPassword.isUnlocked()) {
      masterPassword.decryptData(state.syncConfig.encrypted).then(str => {
        try {
          const c = JSON.parse(str);
          if (state.syncConfig.provider === 'gist') {
            syncScheduler.setAdapter(new GistAdapter({ token: c.token, gistId: c.gistId }));
          } else {
            syncScheduler.setAdapter(new WebDAVAdapter(c));
          }
        } catch {}
      });
    }
  }, [state.loaded, auth.isAdmin, state.syncConfig.enabled]);

  // 深链接接收
  useEffect(() => {
    if (!state.loaded) return;
    import('./services/share').then(({ parseShareLink, clearShareHash }) => {
      const s = parseShareLink();
      if (s) { setIncomingShare(s); clearShareHash(); }
    });
  }, [state.loaded]);

  const groupedSites = useMemo(() => {
    const map = new Map<string, Site[]>();
    for (const s of state.sites) {
      if (activeTag && !(s.tags ?? []).includes(activeTag)) continue;
      const list = map.get(s.categoryId) ?? [];
      list.push(s); map.set(s.categoryId, list);
    }
    for (const [k, list] of map) {
      list.sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        if (state.settings.sortBy === 'name') return a.name.localeCompare(b.name);
        if (state.settings.sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
        if (state.settings.sortBy === 'visits') return (b.visitCount ?? 0) - (a.visitCount ?? 0);
        return 0;
      });
      map.set(k, list);
    }
    return map;
  }, [state.sites, state.settings.sortBy, activeTag]);

  const sortedCategories = [...state.categories].sort((a, b) => a.order - b.order);

  const scrollToCategory = (id: string) => {
    setActiveCategoryId(id);
    document.querySelector<HTMLElement>(`[data-category="${id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const locateSite = (site: Site) => {
    scrollToCategory(site.categoryId);
    setTimeout(() => {
      const card = document.querySelector<HTMLElement>(`[data-site="${site.id}"]`);
      if (card) {
        card.classList.add('flash-highlight');
        setTimeout(() => card.classList.remove('flash-highlight'), 2100);
      }
    }, 400);
  };

  const handleIncomingConfirm = (catId: string) => {
    let targetCatId = catId;
    if (!targetCatId) {
      const now = Date.now();
      const defaultCat = { id: 'shared-received-' + now, name: '收到的分享', icon: '🔗', order: 999, createdAt: now, updatedAt: now };
      dispatch({ type: 'ADD_CATEGORY', payload: defaultCat });
      targetCatId = defaultCat.id;
    }
    actions.receiveSharedSite({
      name: incomingShare!.name ?? '未命名',
      url: incomingShare!.url ?? '',
      description: incomingShare!.description,
      tags: incomingShare!.tags,
      rating: incomingShare!.rating,
      icon: incomingShare!.icon,
      categoryId: targetCatId,
    });
    toast.success('已添加到收藏');
    setIncomingShare(null);
  };

  if (!state.loaded) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;

  return (
    <div class="app">
      <Header
        onSearch={() => setSearchOpen(true)}
        onAdd={() => openAdd()}
        onSettings={() => setSettingsOpen(true)}
        onMenu={() => setSidebarOpen(true)}
        onRequestUnlock={() => setUnlockOpen(true)}
      />
      <div class="app-body">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeId={activeCategoryId}
          onSelect={scrollToCategory}
          onManageCategories={() => guardEditAction(() => setCatMgrOpen(true))}
        />
        <main class="main-content">
          <WelcomeBanner onSetupPassword={() => { setPwSetupMode('setup'); setPwSetupOpen(true); }} />
          <TagBar active={activeTag} onChange={setActiveTag} />
          {sortedCategories.length === 0 || state.sites.length === 0 ? (
            <EmptyState
              onOpenSetup={() => { setPwSetupMode('setup'); setPwSetupOpen(true); }}
              onOpenSync={() => setSyncOpen(true)}
            />
          ) : sortedCategories.map((cat, i) => {
            const sites = groupedSites.get(cat.id) ?? [];
            if (activeTag && sites.length === 0) return null;
            return (
              <LazySection key={cat.id} minHeight={200} eager={i < 3}>
                <SiteGrid category={cat} sites={sites}
                  onEditSite={openEdit} onAddSite={openAdd} onShareSite={openShare} />
              </LazySection>
            );
          })}
        </main>
      </div>

      <SiteForm open={siteFormOpen} site={editingSite} defaultCategoryId={defaultCatId} onClose={() => setSiteFormOpen(false)} />
      <CategoryManager open={catMgrOpen} onClose={() => setCatMgrOpen(false)} />
      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} onLocate={locateSite} />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenImport={() => { setSettingsOpen(false); setImportOpen(true); }}
        onOpenSync={() => { setSettingsOpen(false); setSyncOpen(true); }}
        onOpenStats={() => { setSettingsOpen(false); setStatsOpen(true); }}
        onExportEncrypted={() => { setSettingsOpen(false); setExportPwOpen(true); }}
        onSetupPassword={() => {
          setSettingsOpen(false);
          setPwSetupMode('setup');
          setPwSetupOpen(true);
        }}
        onChangePassword={() => {
          setSettingsOpen(false);
          setPwSetupMode('change');
          setPwSetupOpen(true);
        }}
        onRequestUnlock={() => {
          setSettingsOpen(false);
          setUnlockOpen(true);
        }}
      />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <SyncPanel open={syncOpen} onClose={() => setSyncOpen(false)} />
      <StatsPanel open={statsOpen} onClose={() => setStatsOpen(false)} />

      {/* Auth Dialogs */}
      <UnlockDialog open={unlockOpen} onClose={() => setUnlockOpen(false)} onSuccess={() => {}} />
      <PasswordSetupDialog open={pwSetupOpen} onClose={() => setPwSetupOpen(false)} mode={pwSetupMode} />

      {/* Share */}
      <ShareDialog open={!!shareSite} site={shareSite} onClose={() => setShareSite(null)} />
      {incomingShare && (
        <IncomingShareDialog
          data={incomingShare}
          onClose={() => setIncomingShare(null)}
          onConfirm={handleIncomingConfirm}
        />
      )}

      {/* 加密备份 */}
      <PasswordPrompt
        open={exportPwOpen}
        title="设置备份密码"
        hint="⚠ 密码用于加密导出的备份文件。丢失后无法解密！"
        needConfirm
        onSubmit={async pw => {
          setExportPwOpen(false);
          const { exportAsEncryptedJson } = await import('./services/exporter');
          await exportAsEncryptedJson(state.sites, state.categories, pw);
          toast.success('加密备份已下载');
        }}
        onCancel={() => setExportPwOpen(false)}
      />

      {/* FAB 仅 admin/open 可见 */}
      {auth.canEdit && (
        <button class="fab" onClick={() => openAdd()} aria-label="新增">+</button>
      )}
      <ToastContainer />
      <PWAPrompt />
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
}