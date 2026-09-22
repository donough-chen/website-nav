import { useState, useMemo, useEffect, useRef } from 'preact/hooks';
import type { Site } from '@/types';
import { useApp } from '@/store/context';
import { fuzzyMatch } from '@/utils/fuzzy';
import './SearchPanel.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onLocate: (site: Site) => void;
}

interface Filters {
  categoryId: string;
  tags: string[];
  minRating: number;
  pinnedOnly: boolean;
}

const emptyFilters: Filters = { categoryId: '', tags: [], minRating: 0, pinnedOnly: false };

interface Hit { site: Site; score: number; }

export function SearchPanel({ open, onClose, onLocate }: Props) {
  const { state, dispatch } = useApp();
  const [kw, setKw] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setKw(''); setActiveIdx(0); setFilters(emptyFilters); setShowFilters(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    state.sites.forEach(s => (s.tags ?? []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [state.sites]);

  const hits = useMemo<Hit[]>(() => {
    const q = kw.trim();
    const hasFilter = filters.categoryId || filters.tags.length > 0 || filters.minRating > 0 || filters.pinnedOnly;
    if (!q && !hasFilter) return [];

    const results: Hit[] = [];
    for (const site of state.sites) {
      // 应用筛选
      if (filters.categoryId && site.categoryId !== filters.categoryId) continue;
      if (filters.pinnedOnly && !site.pinned) continue;
      if (filters.minRating > 0 && (site.rating ?? 0) < filters.minRating) continue;
      if (filters.tags.length > 0 && !filters.tags.every(t => (site.tags ?? []).includes(t))) continue;

      if (!q) {
        results.push({ site, score: 1 });
        continue;
      }

      let best = 0;
      for (const text of [site.name, site.description ?? '', site.url, ...(site.tags ?? [])]) {
        if (!text) continue;
        const r = fuzzyMatch(text, q);
        if (r.score > best) best = r.score;
      }
      if (best > 0) results.push({ site, score: best });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 50);
  }, [kw, state.sites, filters]);

  useEffect(() => { setActiveIdx(0); listRef.current?.scrollTo({ top: 0 }); }, [kw, filters]);

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const t = hits[activeIdx];
      if (t) select(t);
    } else if (e.key === 'Escape') onClose();
  };

  const select = (h: Hit) => {
    if (kw.trim()) dispatch({ type: 'ADD_SEARCH_HISTORY', payload: kw.trim() });
    onClose();
    setTimeout(() => onLocate(h.site), 100);
  };

  const toggleTag = (t: string) => {
    setFilters(f => ({
      ...f,
      tags: f.tags.includes(t) ? f.tags.filter(x => x !== t) : [...f.tags, t],
    }));
  };

  const activeFilterCount = (filters.categoryId ? 1 : 0) + filters.tags.length + (filters.minRating > 0 ? 1 : 0) + (filters.pinnedOnly ? 1 : 0);
  const hasQuery = kw.trim() || activeFilterCount > 0;

  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  return (
    <div class="search-mask" onClick={onClose}>
      <div class="search-panel" onClick={e => e.stopPropagation()}>
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            class="search-input"
            placeholder="搜索名称、描述、标签、网址..."
            value={kw}
            onInput={e => setKw((e.target as HTMLInputElement).value)}
            onKeyDown={handleKey}
          />
          <button class={`filter-toggle ${activeFilterCount > 0 ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}>
            ⚙ {activeFilterCount > 0 && <span class="filter-count">{activeFilterCount}</span>}
          </button>
          <kbd class="kbd">ESC</kbd>
        </div>

        {showFilters && (
          <div class="filter-panel">
            <div class="filter-row">
              <span class="filter-label">分类</span>
              <select value={filters.categoryId} onChange={e => setFilters(f => ({ ...f, categoryId: (e.target as HTMLSelectElement).value }))}>
                <option value="">全部</option>
                {state.categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div class="filter-row">
              <span class="filter-label">最低评分</span>
              <div class="rating-filter">
                {[0, 1, 2, 3, 4, 5].map(n => (
                  <button key={n} class={filters.minRating === n ? 'active' : ''}
                    onClick={() => setFilters(f => ({ ...f, minRating: n }))}>
                    {n === 0 ? '不限' : `≥${n}★`}
                  </button>
                ))}
              </div>
            </div>
            <div class="filter-row">
              <span class="filter-label">仅置顶</span>
              <label class={`switch ${filters.pinnedOnly ? 'on' : ''}`}>
                <input type="checkbox" checked={filters.pinnedOnly}
                  onChange={e => setFilters(f => ({ ...f, pinnedOnly: (e.target as HTMLInputElement).checked }))} />
                <span class="switch-slider" />
              </label>
            </div>
            {allTags.length > 0 && (
              <div class="filter-row col">
                <span class="filter-label">标签（多选）</span>
                <div class="tag-picker">
                  {allTags.map(t => (
                    <button key={t} class={`tag-chip-sm ${filters.tags.includes(t) ? 'active' : ''}`}
                      onClick={() => toggleTag(t)}>{t}</button>
                  ))}
                </div>
              </div>
            )}
            {activeFilterCount > 0 && (
              <button class="clear-filters" onClick={() => setFilters(emptyFilters)}>清除筛选</button>
            )}
          </div>
        )}

        {!hasQuery ? (
          <div class="search-history">
            {state.searchHistory.length === 0 ? (
              <div class="search-empty">输入关键词或点击 ⚙ 使用筛选</div>
            ) : (
              <>
                <div class="search-section-title">
                  搜索历史
                  <button class="btn-link" onClick={() => dispatch({ type: 'CLEAR_SEARCH_HISTORY' })}>清除</button>
                </div>
                {state.searchHistory.map(h => (
                  <div key={h} class="history-item" onClick={() => setKw(h)}>
                    <span>🕘</span>{h}
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div class="search-results" ref={listRef}>
            {hits.length === 0 ? (
              <div class="search-empty">无匹配结果</div>
            ) : hits.map((h, i) => {
              const cat = state.categories.find(c => c.id === h.site.categoryId);
              return (
                <div key={h.site.id}
                  class={`result-item ${i === activeIdx ? 'active' : ''}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => select(h)}>
                  <div class="result-title">
                    {h.site.pinned && '📌 '}
                    {highlightText(h.site.name, kw)}
                    {h.site.rating ? <span class="result-rating"> {'★'.repeat(h.site.rating)}</span> : null}
                  </div>
                  <div class="result-meta">
                    {cat && <span class="result-cat">{cat.icon} {cat.name}</span>}
                    <span class="result-url">{h.site.url}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div class="search-footer">
          <span><kbd class="kbd">↑↓</kbd> 选择</span>
          <span><kbd class="kbd">↵</kbd> 打开</span>
          <span class="footer-count">{hits.length > 0 ? `${hits.length} 项结果` : ''}</span>
        </div>
      </div>
    </div>
  );
}

function highlightText(text: string, kw: string) {
  const q = kw.trim().toLowerCase();
  if (!q) return text;
  const t = text.toLowerCase();
  const idx = t.indexOf(q);
  if (idx < 0) return text;
  return (
    <>{text.slice(0, idx)}<mark>{text.slice(idx, idx + q.length)}</mark>{text.slice(idx + q.length)}</>
  );
}