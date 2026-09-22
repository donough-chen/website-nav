import type { Site, Category, Tombstone, Settings } from '@/types';

export interface CloudData {
  version: string;
  syncedAt: number;
  deviceId: string;
  sites: Site[];
  categories: Category[];
  tombstones: Tombstone[];
  settings?: Settings;
}

export interface SyncAdapter {
  readonly name: 'gist' | 'webdav';
  test(): Promise<boolean>;
  pull(): Promise<CloudData | null>;
  push(data: CloudData): Promise<void>;
}

export class SyncError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'SyncError';
  }
}