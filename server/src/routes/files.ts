import type { FastifyPluginAsync } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { rootDir } from '../state.js';
import { safeRelativePath } from '../pathGuard.js';
import { indexFile } from '../fileIndexer.js';
import { getAllFiles } from '../db.js';
import { makeConflictName } from '../conflictName.js';

export const filesRoute: FastifyPluginAsync = async (fastify) => {
  // GET /api/files?path=relative/path/to/file
  fastify.get<{ Querystring: { path: string } }>('/api/files', async (request, reply) => {
    if (!rootDir) return reply.code(503).send({ error: 'No root directory set' });

    let relativePath: string;
    try {
      relativePath = safeRelativePath(rootDir, request.query.path);
    } catch {
      return reply.code(400).send({ error: 'Invalid path' });
    }

    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) return reply.code(404).send({ error: 'File not found' });

    const stat = fs.statSync(absolutePath);
    if (!stat.isFile()) return reply.code(400).send({ error: 'Path is not a file' });
    reply.header('Content-Length', stat.size);
    reply.header('Content-Type', 'application/octet-stream');
    reply.header('X-File-Path', relativePath);
    return reply.send(fs.createReadStream(absolutePath));
  });

  // POST /api/files — multipart upload
  fastify.post('/api/files', async (request, reply) => {
    if (!rootDir) return reply.code(503).send({ error: 'No root directory set' });

    const data = await request.file({ limits: { fileSize: 20 * 1024 * 1024 * 1024 } });
    if (!data) return reply.code(400).send({ error: 'No file' });

    const requestedPath = (data.fields['path'] as any)?.value as string;
    if (!requestedPath) return reply.code(400).send({ error: 'Missing path field' });

    let relativePath: string;
    try {
      relativePath = safeRelativePath(rootDir, requestedPath);
    } catch {
      await data.toBuffer(); // drain
      return reply.code(400).send({ error: 'Invalid path' });
    }

    const destAbsolute = path.join(rootDir, relativePath);

    // Check for conflict: file exists with different content?
    let finalRelativePath = relativePath;
    const existing = getAllFiles().find(f => f.relativePath === relativePath);

    // Read incoming stream to temp file first
    const tmpPath = destAbsolute + '.tmp.' + Date.now();
    fs.mkdirSync(path.dirname(destAbsolute), { recursive: true });

    await new Promise<void>((resolve, reject) => {
      const out = fs.createWriteStream(tmpPath);
      data.file.pipe(out);
      out.on('finish', resolve);
      out.on('error', reject);
      data.file.on('error', reject);
    });

    // Check conflict
    const senderSha256 = (data.fields['sha256'] as any)?.value as string | undefined;
    if (existing && senderSha256 && existing.sha256 !== senderSha256) {
      // Conflict: save as conflict copy
      finalRelativePath = makeConflictName(relativePath, os.hostname());
      const conflictAbsolute = path.join(rootDir, finalRelativePath);
      fs.mkdirSync(path.dirname(conflictAbsolute), { recursive: true });
      fs.renameSync(tmpPath, conflictAbsolute);
      await indexFile(rootDir, conflictAbsolute);
    } else {
      fs.renameSync(tmpPath, destAbsolute);
      await indexFile(rootDir, destAbsolute);
    }

    return reply.code(201).send({ relativePath: finalRelativePath });
  });
};
