import { describe, it, expect } from 'vitest';
import { compareIndexes } from '../compareIndexes.js';
import type { FileMetadata } from '@lan-sync/shared';

function makeFile(relativePath: string, sha256: string, size = 100): FileMetadata {
  return { relativePath, kind: 'file', size, mtime: Date.now(), sha256, indexedAt: Date.now() };
}

function makeDirectory(relativePath: string): FileMetadata {
  return { relativePath, kind: 'directory', size: 0, mtime: Date.now(), sha256: '__directory__', indexedAt: Date.now() };
}

describe('compareIndexes', () => {
  it('returns empty when indexes are identical', () => {
    const file = makeFile('a.txt', 'abc123');
    const { toDownload } = compareIndexes([file], [file]);
    expect(toDownload).toHaveLength(0);
  });

  it('detects file missing on local', () => {
    const remote = makeFile('new.txt', 'xyz789');
    const { toDownload } = compareIndexes([], [remote]);
    expect(toDownload).toHaveLength(1);
    expect(toDownload[0].relativePath).toBe('new.txt');
  });

  it('detects directory missing on local', () => {
    const remote = makeDirectory('empty-folder');
    const { toDownload } = compareIndexes([], [remote]);
    expect(toDownload).toHaveLength(1);
    expect(toDownload[0].kind).toBe('directory');
    expect(toDownload[0].relativePath).toBe('empty-folder');
  });

  it('detects file with different sha256 (conflict)', () => {
    const local = makeFile('shared.txt', 'hash-local');
    const remote = makeFile('shared.txt', 'hash-remote');
    const { toDownload } = compareIndexes([local], [remote]);
    expect(toDownload).toHaveLength(1);
    expect(toDownload[0].sha256).toBe('hash-remote');
  });

  it('ignores files only on local (no delete sync)', () => {
    const local = makeFile('only-local.txt', 'hash1');
    const { toDownload } = compareIndexes([local], []);
    expect(toDownload).toHaveLength(0);
  });

  it('handles multiple files mixed', () => {
    const local = [
      makeFile('same.txt', 'aaa'),
      makeFile('changed.txt', 'old'),
      makeFile('local-only.txt', 'bbb'),
    ];
    const remote = [
      makeFile('same.txt', 'aaa'),
      makeFile('changed.txt', 'new'),
      makeFile('remote-only.txt', 'ccc'),
    ];
    const { toDownload } = compareIndexes(local, remote);
    expect(toDownload).toHaveLength(2); // changed + remote-only
    const paths = toDownload.map(f => f.relativePath).sort();
    expect(paths).toEqual(['changed.txt', 'remote-only.txt']);
  });
});
