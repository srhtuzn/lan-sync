import { describe, it, expect } from 'vitest';
import { safeRelativePath, toRelative } from '../pathGuard.js';
import path from 'node:path';
import os from 'node:os';

describe('safeRelativePath', () => {
  const root = path.join(os.tmpdir(), 'test-root');

  it('normalizes simple path', () => {
    const result = safeRelativePath(root, 'folder/file.txt');
    expect(result).toBe('folder/file.txt');
  });

  it('normalizes backslashes', () => {
    const result = safeRelativePath(root, 'folder\\file.txt');
    expect(result).toBe('folder/file.txt');
  });

  it('strips leading slashes', () => {
    const result = safeRelativePath(root, '/folder/file.txt');
    expect(result).toBe('folder/file.txt');
  });

  it('throws on path traversal with ../', () => {
    expect(() => safeRelativePath(root, '../outside.txt')).toThrow();
  });

  it('throws on deep traversal', () => {
    expect(() => safeRelativePath(root, 'folder/../../outside.txt')).toThrow();
  });

  it('throws on absolute path to different location', () => {
    expect(() => safeRelativePath(root, 'C:\\Windows\\System32\\evil.dll')).toThrow();
  });
});

describe('toRelative', () => {
  const root = path.join(os.tmpdir(), 'test-root2');

  it('converts absolute path to relative with forward slashes', () => {
    const abs = path.join(root, 'sub', 'file.txt');
    expect(toRelative(root, abs)).toBe('sub/file.txt');
  });

  it('throws when path is outside root', () => {
    expect(() => toRelative(root, path.join(os.tmpdir(), 'other', 'file.txt'))).toThrow();
  });
});
