import chokidar from 'chokidar';
import { indexDirectory, indexFile } from './fileIndexer.js';
import { deleteFile } from './db.js';
import { getAutoSyncPeers } from './db.js';
import { toRelative } from './pathGuard.js';
import { broadcast } from './wsClients.js';
import { getLocalIp } from './state.js';

const PORT = 37821;

let watcher: chokidar.FSWatcher | null = null;
const debounceTimers = new Map<string, NodeJS.Timeout>();

// Debounce per file key
function debounce(key: string, fn: () => void, ms = 500): void {
  const existing = debounceTimers.get(key);
  if (existing) clearTimeout(existing);
  debounceTimers.set(key, setTimeout(() => {
    debounceTimers.delete(key);
    fn();
  }, ms));
}

// Notify all auto-sync peers to pull from us (fire-and-forget)
async function notifyPeers(): Promise<void> {
  const peers = getAutoSyncPeers();
  if (peers.length === 0) return;
  const myIp = getLocalIp();
  await Promise.allSettled(peers.map(async (peer) => {
    try {
      await fetch(`http://${peer.ip}:${peer.port}/api/sync/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerIp: myIp, peerPort: PORT }),
      });
    } catch { /* peer unreachable — skip silently */ }
  }));
}

// Batch peer notifications: wait 2 s after last file event before notifying
let peerNotifyTimer: NodeJS.Timeout | null = null;
function schedulePeerNotify(): void {
  if (peerNotifyTimer) clearTimeout(peerNotifyTimer);
  peerNotifyTimer = setTimeout(() => {
    peerNotifyTimer = null;
    notifyPeers().catch(() => {});
  }, 2000);
}

export function startWatcher(root: string): void {
  stopWatcher();
  watcher = chokidar.watch(root, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
    ignored: /(^|[/\\])\../, // ignore dotfiles
  });

  watcher.on('add', (filePath) => {
    debounce(filePath, async () => {
      try {
        await indexFile(root, filePath);
        const relativePath = toRelative(root, filePath);
        broadcast({ type: 'file_changed', relativePath, action: 'added' });
        schedulePeerNotify();
      } catch { /* skip locked/unreadable files */ }
    });
  });

  watcher.on('addDir', (dirPath) => {
    debounce(dirPath, async () => {
      try {
        if (dirPath === root) return;
        await indexDirectory(root, dirPath);
        const relativePath = toRelative(root, dirPath);
        broadcast({ type: 'file_changed', relativePath, action: 'added' });
        schedulePeerNotify();
      } catch { /* skip locked/unreadable dirs */ }
    });
  });

  watcher.on('change', (filePath) => {
    debounce(filePath, async () => {
      try {
        await indexFile(root, filePath);
        const relativePath = toRelative(root, filePath);
        broadcast({ type: 'file_changed', relativePath, action: 'changed' });
        schedulePeerNotify();
      } catch { /* skip locked/unreadable files */ }
    });
  });

  watcher.on('unlink', (filePath) => {
    try {
      const relativePath = toRelative(root, filePath);
      deleteFile(relativePath);
    } catch { /* ignore */ }
  });

  watcher.on('unlinkDir', (dirPath) => {
    try {
      const relativePath = toRelative(root, dirPath);
      deleteFile(relativePath);
    } catch { /* ignore */ }
  });
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  if (peerNotifyTimer) { clearTimeout(peerNotifyTimer); peerNotifyTimer = null; }
  for (const timer of debounceTimers.values()) clearTimeout(timer);
  debounceTimers.clear();
}
