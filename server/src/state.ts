import type { SyncState } from '@lan-sync/shared';
import os from 'node:os';

export let rootDir: string | null = null;
export let syncState: SyncState = 'idle';

export function setRootDir(dir: string | null): void {
  rootDir = dir;
}

export function setSyncState(state: SyncState): void {
  syncState = state;
}

export function getLocalIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}
