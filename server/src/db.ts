import Database from 'better-sqlite3';
import type { StoredPeer } from '@lan-sync/shared';
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
    kind          TEXT NOT NULL DEFAULT 'file',
    size          INTEGER NOT NULL,
    mtime         INTEGER NOT NULL,
    sha256        TEXT NOT NULL,
    indexed_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS peers (
    id         TEXT PRIMARY KEY,
    ip         TEXT NOT NULL,
    port       INTEGER NOT NULL,
    auto_sync  INTEGER NOT NULL DEFAULT 0,
    added_at   INTEGER NOT NULL
  );
`);

const fileColumns = db.prepare('PRAGMA table_info(files)').all() as Array<{ name: string }>;
if (!fileColumns.some(column => column.name === 'kind')) {
  db.exec(`ALTER TABLE files ADD COLUMN kind TEXT NOT NULL DEFAULT 'file'`);
}

export function getAllFiles(): import('@lan-sync/shared').FileMetadata[] {
  return db.prepare('SELECT relative_path, kind, size, mtime, sha256, indexed_at FROM files').all().map((row: any) => ({
    relativePath: row.relative_path,
    kind: row.kind ?? 'file',
    size: row.size,
    mtime: row.mtime,
    sha256: row.sha256,
    indexedAt: row.indexed_at,
  }));
}

export function upsertFile(meta: import('@lan-sync/shared').FileMetadata): void {
  db.prepare(`
    INSERT INTO files (relative_path, kind, size, mtime, sha256, indexed_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(relative_path) DO UPDATE SET
      kind = excluded.kind,
      size = excluded.size,
      mtime = excluded.mtime,
      sha256 = excluded.sha256,
      indexed_at = excluded.indexed_at
  `).run(meta.relativePath, meta.kind, meta.size, meta.mtime, meta.sha256, meta.indexedAt);
}

export function deleteFile(relativePath: string): void {
  db.prepare('DELETE FROM files WHERE relative_path = ?').run(relativePath);
}

export function clearAllFiles(): void {
  db.prepare('DELETE FROM files').run();
}

// ── Peer CRUD ──────────────────────────────────────────────────────────────

export function getAllPeers(): StoredPeer[] {
  return db.prepare('SELECT id, ip, port, auto_sync, added_at FROM peers ORDER BY added_at ASC').all().map((row: any) => ({
    id: row.id,
    ip: row.ip,
    port: row.port,
    autoSync: row.auto_sync === 1,
    addedAt: row.added_at,
  }));
}

export function getAutoSyncPeers(): StoredPeer[] {
  return getAllPeers().filter(p => p.autoSync);
}

export function upsertPeer(peer: Omit<StoredPeer, 'addedAt'>): void {
  db.prepare(`
    INSERT INTO peers (id, ip, port, auto_sync, added_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      ip        = excluded.ip,
      port      = excluded.port,
      auto_sync = excluded.auto_sync
  `).run(peer.id, peer.ip, peer.port, peer.autoSync ? 1 : 0, Date.now());
}

export function updatePeerAutoSync(id: string, autoSync: boolean): void {
  db.prepare('UPDATE peers SET auto_sync = ? WHERE id = ?').run(autoSync ? 1 : 0, id);
}

export function deletePeer(id: string): void {
  db.prepare('DELETE FROM peers WHERE id = ?').run(id);
}
