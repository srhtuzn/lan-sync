import type { FastifyPluginAsync } from 'fastify';
import fs from 'node:fs';
import { setRootDir } from '../state.js';
import { startWatcher } from '../watcher.js';

export const configRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: { rootDir: string } }>('/api/config', async (request, reply) => {
    const { rootDir } = request.body;
    if (!rootDir || !fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
      return reply.code(400).send({ error: 'Directory does not exist' });
    }
    setRootDir(rootDir);
    startWatcher(rootDir);
    return reply.send({ ok: true, rootDir });
  });
};
