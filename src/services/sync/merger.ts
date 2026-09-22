import type { Site, Category, Tombstone } from '@/types';

export interface Conflict<T> {
  id: string;
  type: 'site' | 'category';
  local: T | null;      // null 表示本地已删除
  remote: T | null;     // null 表示远端已删除
  suggestion: 'local' | 'remote';
}

export interface MergeStats {
  added: number;
  updated: number;
  removed: number;
  conflicts: number;
}

export interface MergeResult<T> {
  merged: T[];
  tombstones: Tombstone[];
  stats: MergeStats;
  conflicts: Conflict<T>[];
}

const CONFLICT_WINDOW_MS = 5 * 60 * 1000; // 5 分钟内双端都修改视为冲突

export function mergeRecords<T extends { id: string; updatedAt: number }>(
  local: T[],
  remote: T[],
  localTombstones: Tombstone[],
  remoteTombstones: Tombstone[],
  type: 'site' | 'category',
  conflictDetection = true,
): MergeResult<T> {
  const stats: MergeStats = { added: 0, updated: 0, removed: 0, conflicts: 0 };
  const conflicts: Conflict<T>[] = [];

  // 合并墓碑（取每个 id 的最新 deletedAt）
  const tombMap = new Map<string, number>();
  for (const t of [...localTombstones, ...remoteTombstones]) {
    if (t.type !== type) continue;
    tombMap.set(t.id, Math.max(tombMap.get(t.id) ?? 0, t.deletedAt));
  }

  const localMap = new Map(local.map(x => [x.id, x]));
  const remoteMap = new Map(remote.map(x => [x.id, x]));
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

  const merged: T[] = [];

  for (const id of allIds) {
    const li = localMap.get(id) ?? null;
    const ri = remoteMap.get(id) ?? null;
    const tombTime = tombMap.get(id);

    // 双端删除或某端删除且时间新于另一端更新 → 保持删除
    if (tombTime !== undefined) {
      const liNewer = li && li.updatedAt > tombTime;
      const riNewer = ri && ri.updatedAt > tombTime;
      if (!liNewer && !riNewer) {
        stats.removed++;
        continue;
      }
      // 删除时间在，但一端有更新的记录 → 冲突（删除 vs 修改）
      if (conflictDetection && ((li && liNewer && !ri) || (ri && riNewer && !li))) {
        conflicts.push({
          id, type,
          local: li,
          remote: ri,
          suggestion: liNewer ? 'local' : 'remote',
        });
        stats.conflicts++;
        // 默认按 suggestion 处理
        const pick = liNewer ? li! : ri!;
        merged.push(pick);
        continue;
      }
    }

    if (li && ri) {
      if (li.updatedAt === ri.updatedAt) {
        merged.push(li);
      } else {
        // 双端都更新，且时间接近 → 冲突
        const timeDiff = Math.abs(li.updatedAt - ri.updatedAt);
        const shouldConflict = conflictDetection
          && timeDiff < CONFLICT_WINDOW_MS
          && !recordEqual(li, ri);
        if (shouldConflict) {
          conflicts.push({
            id, type,
            local: li,
            remote: ri,
            suggestion: li.updatedAt > ri.updatedAt ? 'local' : 'remote',
          });
          stats.conflicts++;
        }
        const pick = li.updatedAt >= ri.updatedAt ? li : ri;
        merged.push(pick);
        stats.updated++;
      }
    } else if (li) {
      merged.push(li);
    } else if (ri) {
      merged.push(ri);
      stats.added++;
    }
  }

  // 保留 30 天内墓碑
  const CUTOFF = Date.now() - 30 * 24 * 3600 * 1000;
  const tombstones: Tombstone[] = [];
  for (const [id, deletedAt] of tombMap) {
    if (deletedAt >= CUTOFF) tombstones.push({ id, type, deletedAt });
  }

  return { merged, tombstones, stats, conflicts };
}

function recordEqual(a: any, b: any): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.delete('updatedAt');
  for (const k of keys) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false;
  }
  return true;
}

/** 应用用户对冲突的手动选择 */
export function applyConflictResolutions<T extends { id: string }>(
  merged: T[],
  conflicts: Conflict<T>[],
  resolutions: Map<string, 'local' | 'remote' | 'skip'>,
): { merged: T[]; removedIds: string[] } {
  const removedIds: string[] = [];
  const map = new Map(merged.map(x => [x.id, x]));

  for (const c of conflicts) {
    const choice = resolutions.get(c.id) ?? c.suggestion;
    if (choice === 'skip') {
      map.delete(c.id);
      removedIds.push(c.id);
      continue;
    }
    const pick = choice === 'local' ? c.local : c.remote;
    if (pick) {
      map.set(c.id, pick);
    } else {
      map.delete(c.id);
      removedIds.push(c.id);
    }
  }

  return { merged: Array.from(map.values()), removedIds };
}