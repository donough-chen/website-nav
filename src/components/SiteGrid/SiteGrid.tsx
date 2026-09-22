import { memo } from 'preact/compat';
import type { Site, Category } from '@/types';
import { SiteCard } from '../SiteCard/SiteCard';
import { VirtualGrid } from '../VirtualGrid/VirtualGrid';
import { useDropCategory } from '@/hooks/useDropCategory';
import { useAuth } from '@/hooks/useAuth';
import './SiteGrid.css';

interface Props {
  category: Category;
  sites: Site[];
  onEditSite: (site: Site) => void;
  onAddSite: (categoryId: string) => void;
  onShareSite: (site: Site) => void;
}

const VIRTUAL_THRESHOLD = 100;

function SiteGridBase({ category, sites, onEditSite, onAddSite, onShareSite }: Props) {
  const { canEdit } = useAuth();
  // 拖放接收仅 admin 启用
  const dropBind = canEdit ? useDropCategory(category.id) : {};
  const useVirtual = sites.length > VIRTUAL_THRESHOLD;

  return (
    <section class="site-section" data-category={category.id} {...dropBind}>
      <div class="section-header">
        <h2>
          <span class="section-icon">{category.icon || '📁'}</span>
          {category.name}
          <span class="section-count">{sites.length}</span>
          {useVirtual && <span class="virtual-badge">虚拟滚动</span>}
        </h2>
        {canEdit && (
          <button class="btn btn-ghost" onClick={() => onAddSite(category.id)}>+ 添加</button>
        )}
      </div>
      {sites.length === 0 ? (
        <div class="empty-hint">
          {canEdit ? '暂无网址，点击「+ 添加」新增' : '暂无网址'}
        </div>
      ) : useVirtual ? (
        <VirtualGrid
          items={sites}
          itemHeight={110}
          minItemWidth={240}
          gap={12}
          keyExtractor={s => s.id}
          renderItem={site => <SiteCard site={site} onEdit={onEditSite} onShare={onShareSite} />}
        />
      ) : (
        <div class="site-grid">
          {sites.map(site => (
            <SiteCard key={site.id} site={site} onEdit={onEditSite} onShare={onShareSite} />
          ))}
        </div>
      )}
    </section>
  );
}

export const SiteGrid = memo(SiteGridBase);