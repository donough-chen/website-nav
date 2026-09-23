import { useState, useRef } from 'preact/hooks';
import { memo } from 'preact/compat';
import type { Site } from '@/types';
import { useApp, useActions } from '@/store/context';
import { useAuth } from '@/hooks/useAuth';
import { getFaviconUrl } from '@/utils/favicon';
import { useGesture } from '@/hooks/useGesture';
import { useIsMobile } from '@/hooks/useResponsive';
import { useDragSite } from '@/hooks/useDragSite';
import { LazyIcon } from '../LazyIcon/LazyIcon';
import { formatVisitCount } from '@/utils/format';
import './SiteCard.css';

interface Props {
  site: Site;
  isFavorite: boolean;
  onEdit: (site: Site) => void;
  onShare: (site: Site) => void;
}

function SiteCardBase({ site, isFavorite, onEdit, onShare }: Props) {
  const { state } = useApp();
  const actions = useActions();
  const { canEdit } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const layout = state.settings.layout ?? 'card';

  const faviconUrl = site.icon || getFaviconUrl(site.url, state.settings);

  // 始终调用 hook，通过条件决定是否启用
  const dragBindings = useDragSite(site.id);
  const dragBind = canEdit && !isMobile ? dragBindings : {};

  const visitCount = site.visitCount ?? 0;

  // 手势：访客模式仅保留 onTap（打开链接）+ onLongPress 打开分享 sheet
  useGesture(cardRef, isMobile ? {
    onTap: () => actions.visitSite(site),
    onLongPress: () => setSheetOpen(true),
    onSwipeLeft: canEdit ? (d) => {
      if (d > 100 && confirm(`删除 "${site.name}"？`)) actions.removeSite(site.id);
    } : undefined,
    onSwipeRight: canEdit ? (d) => {
      if (d > 80) actions.togglePin(site.id, !site.pinned);
    } : undefined,
  } : {});

  const handleClick = (e: MouseEvent) => {
    if (isMobile) return;
    if ((e.target as HTMLElement).closest('.card-actions')) return;
    actions.visitSite(site);
  };

  const handleDelete = () => {
    if (confirm(`确定删除 "${site.name}"？`)) actions.removeSite(site.id);
    setShowMenu(false); setSheetOpen(false);
  };

  const showDesc = state.settings.showDescription && site.description && layout !== 'compact';
  const showRating = state.settings.showRating && site.rating;
  const showTags = layout === 'card';

  return (
    <>
      <div
        class="site-card"
        data-site={site.id}
        data-layout={layout}
        ref={cardRef}
        onClick={handleClick}
        title={layout === 'compact' ? `${site.name}\n${site.url}` : undefined}
        {...dragBind}
      >
        <div class="card-icon">
          <LazyIcon src={faviconUrl} name={site.name} />
        </div>
        <div class="card-body">
          <div class="card-header">
            <span class="card-name">{site.name}</span>
            {layout === 'compact' && visitCount > 0 && (
              <span class="visit-count-inline">{formatVisitCount(visitCount)}</span>
            )}
            {isFavorite && <span class="fav-badge" title="已收藏">❤️</span>}
            {site.pinned && <span class="pin-badge" title="已置顶">📌</span>}
          </div>
          {showDesc && (
            <div class="card-desc">{site.description}</div>
          )}
          {(showRating || showTags || visitCount > 0) && (
            <div class="card-footer">
              <div class="footer-left">
                {showRating ? (
                  <span class="rating">
                    {'★'.repeat(Math.round(site.rating!))}
                    <span class="rating-off">{'★'.repeat(5 - Math.round(site.rating!))}</span>
                  </span>
                ) : null}
                {visitCount > 0 && (
                  <span class="visit-count" title={`访问 ${visitCount} 次`}>
                    👁 {formatVisitCount(visitCount)}
                  </span>
                )}
              </div>
              {showTags && site.tags && site.tags.length > 0 && (
                <div class="tags">
                  {site.tags.slice(0, 2).map(t => <span key={t} class="tag">{t}</span>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* PC 端菜单 */}
        {!isMobile && (
          <div class="card-actions" onClick={(e) => e.stopPropagation()}>
            <button class="action-btn" onClick={() => setShowMenu(!showMenu)}>⋯</button>
            {showMenu && (
              <div class="action-menu" onMouseLeave={() => setShowMenu(false)}>
                <button onClick={() => { actions.toggleFavorite(site.id); setShowMenu(false); }}>
                  {isFavorite ? '💔 取消收藏' : '❤️ 收藏'}
                </button>
                <button onClick={() => { onShare(site); setShowMenu(false); }}>📤 分享</button>
                {canEdit && (
                  <>
                    <button onClick={() => { onEdit(site); setShowMenu(false); }}>✏ 编辑</button>
                    <button onClick={() => { actions.togglePin(site.id, !site.pinned); setShowMenu(false); }}>
                      📌 {site.pinned ? '取消置顶' : '置顶'}
                    </button>
                    <button class="danger" onClick={handleDelete}>🗑 删除</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 移动端 ActionSheet */}
      {sheetOpen && (
        <div class="sheet-mask" onClick={() => setSheetOpen(false)}>
          <div class="action-sheet" onClick={e => e.stopPropagation()}>
            <div class="sheet-title">{site.name}</div>
            <button onClick={() => { window.open(site.url, '_blank'); setSheetOpen(false); }}>🔗 打开</button>
            <button onClick={() => { actions.toggleFavorite(site.id); setSheetOpen(false); }}>
              {isFavorite ? '💔 取消收藏' : '❤️ 收藏'}
            </button>
            <button onClick={() => { onShare(site); setSheetOpen(false); }}>📤 分享</button>
            {canEdit && (
              <>
                <button onClick={() => { onEdit(site); setSheetOpen(false); }}>✏ 编辑</button>
                <button onClick={() => { actions.togglePin(site.id, !site.pinned); setSheetOpen(false); }}>
                  📌 {site.pinned ? '取消置顶' : '置顶'}
                </button>
                <button class="danger" onClick={handleDelete}>🗑 删除</button>
              </>
            )}
            <button class="cancel" onClick={() => setSheetOpen(false)}>取消</button>
          </div>
        </div>
      )}
    </>
  );
}

export const SiteCard = memo(SiteCardBase, (prev, next) => {
  const a = prev.site, b = next.site;
  return (
    a.id === b.id && a.name === b.name && a.url === b.url && a.icon === b.icon &&
    a.description === b.description && a.rating === b.rating && a.pinned === b.pinned &&
    a.visitCount === b.visitCount && a.categoryId === b.categoryId &&
    prev.isFavorite === next.isFavorite &&
    JSON.stringify(a.tags) === JSON.stringify(b.tags) &&
    prev.onEdit === next.onEdit && prev.onShare === next.onShare
  );
});