import { useMemo } from 'preact/hooks';
import { useApp } from '@/store/context';
import './TagBar.css';

interface Props {
  active: string | null;
  onChange: (tag: string | null) => void;
}

export function TagBar({ active, onChange }: Props) {
  const { state } = useApp();

  const tags = useMemo(() => {
    const counter = new Map<string, number>();
    for (const s of state.sites) {
      for (const t of s.tags ?? []) {
        counter.set(t, (counter.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counter.entries()).sort((a, b) => b[1] - a[1]);
  }, [state.sites]);

  if (tags.length === 0) return null;

  return (
    <div class="tag-bar">
      <button class={`tag-chip ${!active ? 'active' : ''}`} onClick={() => onChange(null)}>
        全部
      </button>
      {tags.map(([t, n]) => (
        <button key={t} class={`tag-chip ${active === t ? 'active' : ''}`} onClick={() => onChange(active === t ? null : t)}>
          {t} <span class="chip-count">{n}</span>
        </button>
      ))}
    </div>
  );
}