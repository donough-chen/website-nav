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
import { BackToTop } from './components/BackToTop/BackToTop';
import { ShareDialog } from './components/ShareDialog/ShareDialog';
import { IncomingShareDialog } from './components/ShareDialog/IncomingShareDialog';
import { UnlockDialog } from './components/UnlockDialog/UnlockDialog';
import { PasswordSetupDialog } from './components/PasswordSetupDialog/PasswordSetupDialog';
import { ModeSelectDialog } from './components/ModeSelectDialog/ModeSelectDialog';
// import { WelcomeBanner } from './components/WelcomeBanner/WelcomeBanner';
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
import { BUILTIN_CATEGORIES, BUILTIN_CATEGORY, POPULAR_LIMIT } from './constants/builtInCategories';
import type { Site } from './types';

function Main() {
  useTheme();
  const { state, dispatch } = useApp();
  const actions = useActions();
  const auth = useAuth();
  useAutoFetchPublic();

  // 首次访问模式选择
  const showModeSelect = state.loaded && auth.uninitialized;

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
  const [scrollRequest, setScrollRequest] = useState<{ categoryId: string; siteId?: string; seq: number } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set());
  const scrollSeq = useRef(0);
  const [shareSite, setShareSite] = useState<Site | null>(null);
  const [incomingShare, setIncomingShare] = useState<Partial<Site> | null>(null);
  const [exportPwOpen, setExportPwOpen] = useState(false);

  // Auth 相关
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [pwSetupOpen, setPwSetupOpen] = useState(false);
  const [pwSetupMode, setPwSetupMode] = useState<'setup' | 'change'>('setup');

  const handleLogoTrigger = () => {
    if (auth.isAdmin) {
      // 已是 admin，锁定
      if (confirm('锁定管理员会话？')) {
        authService.lock();
        dispatch({ type: 'SET_AUTH_MODE', payload: { mode: state.appMode ?? 'open' } });
        toast.info('🔒 已锁定');
      }
    } else if (auth.hasPassword) {
      setUnlockOpen(true);
    } else {
      // 未设 admin 密码 → 引导设置
      setPwSetupMode('setup');
      setPwSetupOpen(true);
    }
  };

  const handleSelectMode = (mode: 'guest' | 'open') => {
    dispatch({ type: 'SET_APP_MODE', payload: mode });
  };

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
    dispatch({ type: 'SET_AUTH_MODE', payload: { mode: state.appMode ?? 'open' } });
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
      dispatch({ type: 'SET_AUTH_MODE', payload: { mode: state.appMode ?? 'open' } });
      return;
    }
    const t = setTimeout(() => {
      authService.lock();
      dispatch({ type: 'SET_AUTH_MODE', payload: { mode: state.appMode ?? 'open' } });
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

  const displayCategories = useMemo(() => {
    const userCats = [...state.categories].sort((a, b) => a.order - b.order);
    return [...BUILTIN_CATEGORIES, ...userCats];
  }, [state.categories]);

  const groupedSites = useMemo(() => {
    const map = new Map<string, Site[]>();
    const passTag = (s: Site) => !activeTag || (s.tags ?? []).includes(activeTag);

    // 1. 用户分类：按 categoryId 归组
    for (const s of state.sites) {
      if (!passTag(s)) continue;
      const list = map.get(s.categoryId) ?? [];
      list.push(s);
      map.set(s.categoryId, list);
    }
    // 用户分类排序
    for (const cat of state.categories) {
      const list = map.get(cat.id);
      if (!list) continue;
      list.sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        if (state.settings.sortBy === 'name') return a.name.localeCompare(b.name);
        if (state.settings.sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
        if (state.settings.sortBy === 'visits') return (b.visitCount ?? 0) - (a.visitCount ?? 0);
        return 0;
      });
    }

    // 2. 常用（按访问量排序，取 Top 30）
    const popular = state.sites
      .filter(s => (s.visitCount ?? 0) > 0)
      .filter(passTag)
      .sort((a, b) => (b.visitCount ?? 0) - (a.visitCount ?? 0))
      .slice(0, POPULAR_LIMIT);
    map.set(BUILTIN_CATEGORY.POPULAR, popular);

    // 3. 收藏（按收藏顺序，最新在前）
    const siteMap = new Map(state.sites.map(s => [s.id, s]));
    const favorites = state.favorites
      .map(id => siteMap.get(id))
      .filter((s): s is Site => !!s && passTag(s));
    map.set(BUILTIN_CATEGORY.FAVORITES, favorites);

    return map;
  }, [state.sites, state.categories, state.favorites, state.settings.sortBy, activeTag]);

  const requestScroll = (target: { categoryId: string; siteId?: string }) => {
    scrollSeq.current += 1;
    setScrollRequest({ ...target, seq: scrollSeq.current });
  };

  // 定位跳转前，把目标分类及其之前的分类全部展开（永久渲染），
  // 这样滚动路径上每个分类都是真实高度，scrollIntoView 才能精确定位。
  const expandUpTo = (categoryId: string) => {
    setExpandedCategories(prev => {
      const toAdd: string[] = [];
      for (const cat of displayCategories) {
        const sites = groupedSites.get(cat.id) ?? [];
        if (sites.length === 0) continue;
        if (!prev.has(cat.id)) toAdd.push(cat.id);
        if (cat.id === categoryId) break;
      }
      if (toAdd.length === 0) return prev;
      const next = new Set(prev);
      toAdd.forEach(id => next.add(id));
      return next;
    });
  };

  const scrollToCategory = (id: string) => {
    setActiveCategoryId(id);
    expandUpTo(id);
    requestScroll({ categoryId: id });
  };

  const locateSite = (site: Site) => {
    setActiveCategoryId(site.categoryId);
    expandUpTo(site.categoryId);
    requestScroll({ categoryId: site.categoryId, siteId: site.id });
  };

  // 在目标分类渲染完成后执行滚动定位
  useEffect(() => {
    if (!scrollRequest) return;
    const { categoryId, siteId } = scrollRequest;
    let cancelled = false;

    // 双 rAF 等待展开的分类完成 DOM 渲染后再定位，避免占位高度导致的偏移
    requestAnimationFrame(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        const card = siteId
          ? document.querySelector<HTMLElement>(`[data-site="${siteId}"]`)
          : null;
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('flash-highlight');
          setTimeout(() => card.classList.remove('flash-highlight'), 2100);
        } else {
          document.querySelector<HTMLElement>(`[data-category="${categoryId}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    return () => { cancelled = true; };
  }, [scrollRequest]);

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
        onLogoTrigger={handleLogoTrigger}
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
          {/* <WelcomeBanner onSetupPassword={() => { setPwSetupMode('setup'); setPwSetupOpen(true); }} /> */}
          <TagBar active={activeTag} onChange={setActiveTag} />
          {state.sites.length === 0 ? (
            <EmptyState
              onOpenSetup={() => { setPwSetupMode('setup'); setPwSetupOpen(true); }}
              onOpenSync={() => setSyncOpen(true)}
            />
          ) : displayCategories.map((cat, i) => {
            const sites = groupedSites.get(cat.id) ?? [];
            // 空的内置分类也不显示（避免占位）
            if (sites.length === 0) return null;
            return (
              <LazySection key={cat.id} minHeight={200} eager={i < 3} forceRender={expandedCategories.has(cat.id)}>
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
      />
      {/* 首次访问模式选择 */}
      <ModeSelectDialog
        open={showModeSelect}
        onSelect={handleSelectMode}
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
      <BackToTop />
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