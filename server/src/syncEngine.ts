import fs from 'node:fs';
import path from 'node:path';
import type { FileIndex } from '@lan-sync/shared';
import { getAllFiles } from './db.js';
import { broadcast } from './wsClients.js';
import { setSyncState, syncState } from './state.js';
import { indexFile } from './fileIndexer.js';
import { compareIndexes } from './compareIndexes.js';
import { makeConflictName } from './conflictName.js';

export async function syncFromPeer(peerIp: string, peerPort: number, localRoot: string): Promise<void> {
  setSyncState('syncing');
  broadcast({ type: 'state_changed', state: 'syncing' });

  try {
    // 1. Fetch peer's index
    const res = await fetch(`http://${peerIp}:${peerPort}/api/index`);
    if (!res.ok) throw new Error(`Peer index fetch failed: ${res.status}`);
    const peerIndex: FileIndex = await res.json();

    const localFilesArr = getAllFiles();
    const localFiles = new Map(localFilesArr.map(f => [f.relativePath, f]));

    // 2. Find files to download: missing or sha256 differs
    const { toDownload } = compareIndexes(localFilesArr, peerIndex.files);

    let synced = 0;
    const startTime = Date.now();

    for (const peerFile of toDownload) {
      const localFile = localFiles.get(peerFile.relativePath);
      const isConflict = localFile && localFile.sha256 !== peerFile.sha256;
      let tmpPath: string | null = null;

      try {
        broadcast({
          type: 'sync_progress',
          peerId: `${peerIp}:${peerPort}`,
          file: peerFile.relativePath,
          transferred: 0,
          total: peerFile.size,
          speed: 0,
        });

        // Download file from peer
        const fileRes = await fetch(
          `http://${peerIp}:${peerPort}/api/files?path=${encodeURIComponent(peerFile.relativePath)}`
        );
        if (!fileRes.ok || !fileRes.body) {
          broadcast({
            type: 'sync_error',
            peerId: `${peerIp}:${peerPort}`,
            file: peerFile.relativePath,
            error: `HTTP ${fileRes.status}`,
          });
          continue;
        }

        // Determine destination path
        let destRelative = peerFile.relativePath;
        if (isConflict) {
          // Conflict: save as conflict copy
          destRelative = makeConflictName(peerFile.relativePath, peerIp);
        }

        const destAbsolute = path.join(localRoot, destRelative);
        fs.mkdirSync(path.dirname(destAbsolute), { recursive: true });

        // Write to temp file first, then rename atomically
        tmpPath = destAbsolute + '.tmp.' + Date.now();
        const writeStream = fs.createWriteStream(tmpPath);

        let transferred = 0;
        const startFileTime = Date.now();

        // Stream with progress
        const reader = fileRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          writeStream.write(value);
          transferred += value.length;
          const elapsed = (Date.now() - startFileTime) / 1000 || 0.001;
          broadcast({
            type: 'sync_progress',
            peerId: `${peerIp}:${peerPort}`,
            file: peerFile.relativePath,
            transferred,
            total: peerFile.size,
            speed: Math.round(transferred / elapsed),
          });
        }

        await new Promise<void>((resolve, reject) => {
          writeStream.end();
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });

        fs.renameSync(tmpPath, destAbsolute);
        await indexFile(localRoot, destAbsolute);
        synced++;

      } catch (err: any) {
        broadcast({
          type: 'sync_error',
          peerId: `${peerIp}:${peerPort}`,
          file: peerFile.relativePath,
          error: err?.message ?? 'Unknown error',
        });
        if (tmpPath) try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
      }
    }

    broadcast({
      type: 'sync_complete',
      peerId: `${peerIp}:${peerPort}`,
      filesSynced: synced,
      duration: Date.now() - startTime,
    });

  } catch (err: any) {
    setSyncState('error');
    broadcast({ type: 'state_changed', state: 'error' });
  } finally {
    if (syncState !== 'error') {
      setSyncState('idle');
      broadcast({ type: 'state_changed', state: 'idle' });
    }
  }
}
