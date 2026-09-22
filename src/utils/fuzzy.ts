export interface MatchResult {
  score: number;
  matches: number[];
}

export function fuzzyMatch(text: string, pattern: string): MatchResult {
  if (!pattern) return { score: 0, matches: [] };
  const t = text.toLowerCase();
  const p = pattern.toLowerCase();

  const idx = t.indexOf(p);
  if (idx >= 0) {
    return {
      score: 1000 - idx,
      matches: Array.from({ length: p.length }, (_, i) => idx + i),
    };
  }

  let ti = 0, pi = 0;
  const matches: number[] = [];
  while (ti < t.length && pi < p.length) {
    if (t[ti] === p[pi]) {
      matches.push(ti);
      pi++;
    }
    ti++;
  }
  return pi === p.length
    ? { score: 100 - matches[matches.length - 1] + matches.length, matches }
    : { score: 0, matches: [] };
}