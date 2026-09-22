import type { Site, Category, Tombstone } from '@/types';
import type { SyncAdapter, CloudData } from './types';
import { mergeRecords, type Conflict } from './merger';
import { getDeviceId } from '@/utils/device';

export interface SyncSnapshot {
  sites: Site[];
  categories: Category[];
  tombstones: Tombstone[];
}

export interface SyncOutcome {
  action: 'upload' | 'download' | 'merged';
  stats: { site: any; category: any };
  conflicts: {
    sites: Conflict<Site>[];
    categories: Conflict<Category>[];
  };
  mergedData: SyncSnapshot;
  cloudEmpty: boolean;
}

export class SyncScheduler {
  private adapter: SyncAdapter | null = null;
  private syncing = false;
  private autoTimer: number | null = null;
  private autoDelay = 30_000;

  setAdapter(adapter: SyncAdapter | null) {
    this.adapter = adapter;
  }

  hasAdapter() { return this.adapter !== null; }

  scheduleAuto(fn: () => Promise<void>) {
    if (this.autoTimer) clearTimeout(this.autoTimer);
    this.autoTimer = window.setTimeout(fn, this.autoDelay);
  }

  cancelAuto() {
    if (this.autoTimer) { clearTimeout(this.autoTimer); this.autoTimer = null; }
  }

  /** 同步（拉取 → 合并 → 检测冲突 → 返回结果，由调用方决定是否推送） */
  async prepareSync(local: SyncSnapshot): Promise<SyncOutcome> {
    if (!this.adapter) throw new Error('未配置同步适配器');
    if (this.syncing) throw new Error('已有同步任务进行中');
    this.syncing = true;

    try {
      const remote = await this.adapter.pull();
      if (!remote) {
        // 云端为空，直接上传
        const data: CloudData = {
          version: '1.0',
          syncedAt: Date.now(),
          deviceId: getDeviceId(),
          sites: local.sites,
          categories: local.categories,
          tombstones: local.tombstones,
        };
        return {
          action: 'upload',
          stats: { site: { added: local.sites.length }, category: { added: local.categories.length } },
          conflicts: { sites: [], categories: [] },
          mergedData: local,
          cloudEmpty: true,
        };
      }

      const siteMerge = mergeRecords(local.sites, remote.sites, local.tombstones, remote.tombstones, 'site');
      const catMerge = mergeRecords(local.categories, remote.categories, local.tombstones, remote.tombstones, 'category');

      return {
        action: 'merged',
        stats: { site: siteMerge.stats, category: catMerge.stats },
        conflicts: { sites: siteMerge.conflicts, categories: catMerge.conflicts },
        mergedData: {
          sites: siteMerge.merged,
          categories: catMerge.merged,
          tombstones: [...siteMerge.tombstones, ...catMerge.tombstones],
        },
        cloudEmpty: false,
      };
    } finally {
      this.syncing = false;
    }
  }

  async pushOnly(data: SyncSnapshot): Promise<void> {
    if (!this.adapter) throw new Error('未配置同步适配器');
    const payload: CloudData = {
      version: '1.0',
      syncedAt: Date.now(),
      deviceId: getDeviceId(),
      sites: data.sites,
      categories: data.categories,
      tombstones: data.tombstones,
    };
    await this.adapter.push(payload);
  }

  async pullOnly(): Promise<CloudData | null> {
    if (!this.adapter) throw new Error('未配置同步适配器');
    return this.adapter.pull();
  }
}

export const syncScheduler = new SyncScheduler();