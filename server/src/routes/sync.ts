import type { FastifyPluginAsync } from 'fastify';
import { rootDir, syncState } from '../state.js';
import { syncFromPeer } from '../syncEngine.js';
import type { SyncRunRequest } from '@lan-sync/shared';

export const syncRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: SyncRunRequest }>('/api/sync/run', async (request, reply) => {
    if (!rootDir) return reply.code(503).send({ error: 'No root directory set' });
    if (syncState === 'syncing') return reply.code(409).send({ error: 'Sync already in progress' });

    const { peerIp, peerPort } = request.body;
    if (!peerIp || !peerPort) return reply.code(400).send({ error: 'peerIp and peerPort required' });

    // Run sync in background, don't await
    syncFromPeer(peerIp, peerPort, rootDir).catch(() => {});

    return reply.code(202).send({ ok: true, message: 'Sync started' });
  });
};
