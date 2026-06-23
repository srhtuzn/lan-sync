import path from 'node:path';

export function safeRelativePath(rootDir: string, requestedPath: string): string {
  // Normalize: use forward slashes, remove leading slashes
  const normalized = requestedPath.replace(/\\/g, '/').replace(/^\/+/, '');

  // Resolve to absolute, then verify it's within rootDir
  const absolute = path.resolve(rootDir, normalized);
  const resolvedRoot = path.resolve(rootDir);

  if (!absolute.startsWith(resolvedRoot + path.sep) && absolute !== resolvedRoot) {
    throw new Error(`Path traversal attempt: ${requestedPath}`);
  }

  // Return normalized relative path (forward slashes)
  return path.relative(resolvedRoot, absolute).replace(/\\/g, '/');
}

export function toRelative(rootDir: string, absolutePath: string): string {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedAbsolute = path.resolve(absolutePath);
  if (!resolvedAbsolute.startsWith(resolvedRoot + path.sep) && resolvedAbsolute !== resolvedRoot) {
    throw new Error(`Path outside root: ${absolutePath}`);
  }
  return path.relative(resolvedRoot, resolvedAbsolute).replace(/\\/g, '/');
}
