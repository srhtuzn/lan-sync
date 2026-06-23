import type { FastifyPluginAsync } from 'fastify';
import os from 'node:os';
import { getAllFiles } from '../db.js';
import { rootDir } from '../state.js';
import type { FileIndex } from '@lan-sync/shared';

export const indexRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/index', async (): Promise<FileIndex> => ({
    deviceName: os.hostname(),
    rootPath: rootDir ?? '',
    files: getAllFiles(),
    generatedAt: Date.now(),
  }));
};
