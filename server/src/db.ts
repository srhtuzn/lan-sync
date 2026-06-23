import Database from 'better-sqlite3';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const DB_PATH = path.join(os.homedir(), '.lan-sync', 'index.db');

// ensure directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    relative_path TEXT PRIMARY KEY,
    size          INTEGER NOT NULL,
    mtime         INTEGER NOT NULL,
    sha256        TEXT NOT NULL,
    indexed_at    INTEGER NOT NULL
  );
`);

export function getAllFiles(): import('@lan-sync/shared').FileMetadata[] {
  return db.prepare('SELECT relative_path, size, mtime, sha256, indexed_at FROM files').all().map((row: any) => ({
    relativePath: row.relative_path,
    size: row.size,
    mtime: row.mtime,
    sha256: row.sha256,
    indexedAt: row.indexed_at,
  }));
}

export function upsertFile(meta: import('@lan-sync/shared').FileMetadata): void {
  db.prepare(`
    INSERT INTO files (relative_path, size, mtime, sha256, indexed_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(relative_path) DO UPDATE SET
      size = excluded.size,
      mtime = excluded.mtime,
      sha256 = excluded.sha256,
      indexed_at = excluded.indexed_at
  `).run(meta.relativePath, meta.size, meta.mtime, meta.sha256, meta.indexedAt);
}

export function deleteFile(relativePath: string): void {
  db.prepare('DELETE FROM files WHERE relative_path = ?').run(relativePath);
}

export function clearAllFiles(): void {
  db.prepare('DELETE FROM files').run();
}
