import chokidar from 'chokidar';
import { indexFile } from './fileIndexer.js';
import { deleteFile } from './db.js';
import { toRelative } from './pathGuard.js';
import { broadcast } from './wsClients.js';

let watcher: chokidar.FSWatcher | null = null;
const debounceTimers = new Map<string, NodeJS.Timeout>();

function debounce(key: string, fn: () => void, ms = 500): void {
  const existing = debounceTimers.get(key);
  if (existing) clearTimeout(existing);
  debounceTimers.set(key, setTimeout(() => {
    debounceTimers.delete(key);
    fn();
  }, ms));
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
      } catch { /* skip locked/unreadable files */ }
    });
  });

  watcher.on('change', (filePath) => {
    debounce(filePath, async () => {
      try {
        await indexFile(root, filePath);
        const relativePath = toRelative(root, filePath);
        broadcast({ type: 'file_changed', relativePath, action: 'changed' });
      } catch { /* skip locked/unreadable files */ }
    });
  });

  watcher.on('unlink', (filePath) => {
    try {
      const relativePath = toRelative(root, filePath);
      deleteFile(relativePath);
    } catch { /* ignore */ }
  });
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  for (const timer of debounceTimers.values()) clearTimeout(timer);
  debounceTimers.clear();
}
