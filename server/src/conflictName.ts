import path from 'node:path';

export function makeConflictName(relativePath: string, fromDevice: string, now: Date = new Date()): string {
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-') + ' ' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
  const ext = path.extname(relativePath);
  const base = relativePath.slice(0, relativePath.length - ext.length);
  return `${base} (conflict ${ts} from ${fromDevice})${ext}`;
}
