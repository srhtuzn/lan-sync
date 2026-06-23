import type { SyncState } from '@lan-sync/shared';

export let rootDir: string | null = null;
export let syncState: SyncState = 'idle';

export function setRootDir(dir: string | null): void {
  rootDir = dir;
}

export function setSyncState(state: SyncState): void {
  syncState = state;
}
