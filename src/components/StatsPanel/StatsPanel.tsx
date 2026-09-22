import { useMemo } from 'preact/hooks';
import { useApp } from '@/store/context';
import { Modal } from '../Modal/Modal';
import './StatsPanel.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function StatsPanel({ open, onClose }: Props) {
  const { state } = useApp();

  const stats = useMemo(() => {
    const totalSites = state.sites.length;
    const totalCats = state.categories.length;
    const totalVisits = state.sites.reduce((s, x) => s + (x.visitCount ?? 0), 0);
    const totalRated = state.sites.filter(s => s.rating).length;
    const avgRating = totalRated > 0
      ? (state.sites.reduce((s, x) => s + (x.rating ?? 0), 0) / totalRated).toFixed(1)
      : '-';

    const catCountMap = new Map<string, number>();
    for (const s of state.sites) {
      catCountMap.set(s.categoryId, (catCountMap.get(s.categoryId) ?? 0) + 1);
    }
    const catStats = state.categories.map(c => ({
      cat: c,
      count: catCountMap.get(c.id) ?? 0,
    })).sort((a, b) => b.count - a.count);
    const maxCatCount = Math.max(1, ...catStats.map(c => c.count));

    const topVisited = [...state.sites]
      .filter(s => (s.visitCount ?? 0) > 0)
      .sort((a, b) => (b.visitCount ?? 0) - (a.visitCount ?? 0))
      .slice(0, 10);

    return { totalSites, totalCats, totalVisits, avgRating, catStats, maxCatCount, topVisited };
  }, [state.sites, state.categories]);

  return (
    <Modal open={open} title="统计" onClose={onClose} width={640}>
      <div class="stats-panel">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{stats.totalSites}</div>
            <div class="stat-label">网址总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{stats.totalCats}</div>
            <div class="stat-label">分类数量</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{stats.totalVisits}</div>
            <div class="stat-label">总访问次数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{stats.avgRating}</div>
            <div class="stat-label">平均评分</div>
          </div>
        </div>

        <section class="stats-section">
          <h4>分类分布</h4>
          <div class="cat-bars">
            {stats.catStats.map(({ cat, count }) => (
              <div key={cat.id} class="cat-bar-row">
                <span class="cat-bar-name">{cat.icon} {cat.name}</span>
                <div class="cat-bar-track">
                  <div class="cat-bar-fill" style={{ width: `${(count / stats.maxCatCount) * 100}%` }} />
                </div>
                <span class="cat-bar-count">{count}</span>
              </div>
            ))}
          </div>
        </section>

        {stats.topVisited.length > 0 && (
          <section class="stats-section">
            <h4>最常访问 Top 10</h4>
            <div class="top-list">
              {stats.topVisited.map((s, i) => (
                <div key={s.id} class="top-row">
                  <span class="top-rank">{i + 1}</span>
                  <span class="top-name">{s.name}</span>
                  <span class="top-count">{s.visitCount} 次</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}