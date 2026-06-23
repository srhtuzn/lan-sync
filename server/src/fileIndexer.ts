import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { FileMetadata } from '@lan-sync/shared';
import { upsertFile, clearAllFiles } from './db.js';
import { toRelative } from './pathGuard.js';

const DIRECTORY_SHA = '__directory__';

export function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export async function indexFile(rootDir: string, absolutePath: string): Promise<FileMetadata> {
  const stat = fs.statSync(absolutePath);
  const sha256 = await hashFile(absolutePath);
  const meta: FileMetadata = {
    relativePath: toRelative(rootDir, absolutePath),
    kind: 'file',
    size: stat.size,
    mtime: stat.mtimeMs,
    sha256,
    indexedAt: Date.now(),
  };
  upsertFile(meta);
  return meta;
}

export async function indexDirectory(rootDir: string, absolutePath: string): Promise<FileMetadata> {
  const stat = fs.statSync(absolutePath);
  const meta: FileMetadata = {
    relativePath: toRelative(rootDir, absolutePath),
    kind: 'directory',
    size: 0,
    mtime: stat.mtimeMs,
    sha256: DIRECTORY_SHA,
    indexedAt: Date.now(),
  };
  upsertFile(meta);
  return meta;
}

export async function scanDirectory(rootDir: string): Promise<FileMetadata[]> {
  clearAllFiles();

  // Collect all paths first
  const directoryPaths: string[] = [];
  const filePaths: string[] = [];

  function collectPaths(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // skip unreadable dirs
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        directoryPaths.push(full);
        collectPaths(full);
      } else if (entry.isFile()) {
        filePaths.push(full);
      }
    }
  }

  collectPaths(rootDir);

  // Index directories before files so empty folders can sync too.
  const metas: FileMetadata[] = [];
  for (const directoryPath of directoryPaths) {
    try {
      const meta = await indexDirectory(rootDir, directoryPath);
      metas.push(meta);
    } catch {
      // skip directories that can't be read
    }
  }

  for (const filePath of filePaths) {
    try {
      const meta = await indexFile(rootDir, filePath);
      metas.push(meta);
    } catch {
      // skip files that can't be read
    }
  }

  return metas;
}
