/**
 * 访问量格式化
 * <10000 → 原值
 * <1亿 → "X.X万"
 * >=1亿 → "X.X亿"
 */
export function formatVisitCount(n: number | undefined | null): string {
  const v = n ?? 0;
  if (v < 10_000) return String(v);
  if (v < 100_000_000) return (v / 10_000).toFixed(1).replace(/\.0$/, '') + '万';
  return (v / 100_000_000).toFixed(1).replace(/\.0$/, '') + '亿';
}