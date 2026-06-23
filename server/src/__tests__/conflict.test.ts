import { describe, it, expect } from 'vitest';
import { makeConflictName } from '../conflictName.js';

describe('makeConflictName', () => {
  const fakeNow = new Date('2026-06-23T14:22:00');

  it('produces correct format for simple file', () => {
    const result = makeConflictName('document.pdf', 'LAPTOP', fakeNow);
    expect(result).toBe('document (conflict 2026-06-23 1422 from LAPTOP).pdf');
  });

  it('preserves subdirectory structure', () => {
    const result = makeConflictName('photos/img.jpg', 'PC2', fakeNow);
    expect(result).toBe('photos/img (conflict 2026-06-23 1422 from PC2).jpg');
  });

  it('handles files with no extension', () => {
    const result = makeConflictName('Makefile', 'SERVER', fakeNow);
    expect(result).toBe('Makefile (conflict 2026-06-23 1422 from SERVER)');
  });

  it('handles files with multiple dots', () => {
    const result = makeConflictName('archive.tar.gz', 'NAS', fakeNow);
    expect(result).toBe('archive.tar (conflict 2026-06-23 1422 from NAS).gz');
  });

  it('zero-pads single-digit hour and minute', () => {
    const earlyMorning = new Date('2026-06-23T09:05:00');
    const result = makeConflictName('file.txt', 'HOST', earlyMorning);
    expect(result).toBe('file (conflict 2026-06-23 0905 from HOST).txt');
  });
});
