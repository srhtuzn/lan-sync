import type { FastifyPluginAsync } from 'fastify';
import type { AddPeerRequest, UpdatePeerRequest, DeviceStatus } from '@lan-sync/shared';
import {
  getAllPeers,
  upsertPeer,
  deletePeer,
  updatePeerAutoSync,
} from '../db.js';

const PORT = 37821;

export const peersRoute: FastifyPluginAsync = async (fastify) => {
  // GET /api/peers — kayıtlı tüm cihazları listele (canlı durum ile)
  fastify.get('/api/peers', async () => {
    const peers = getAllPeers();
    const enriched = await Promise.all(peers.map(async (peer) => {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 600);
        const res = await fetch(`http://${peer.ip}:${peer.port}/api/status`, { signal: controller.signal });
        clearTimeout(t);
        const status: DeviceStatus = await res.json();
        return { ...peer, status, reachable: true };
      } catch {
        return { ...peer, status: null, reachable: false };
      }
    }));
    return enriched;
  });

  // POST /api/peers — cihaz ekle
  fastify.post<{ Body: AddPeerRequest }>('/api/peers', async (request, reply) => {
    const { ip, port = PORT } = request.body;
    if (!ip) return reply.code(400).send({ error: 'ip gerekli' });
    const id = `${ip}:${port}`;

    let status: DeviceStatus | null = null;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(`http://${ip}:${port}/api/status`, { signal: controller.signal });
      clearTimeout(t);
      status = await res.json();
    } catch { /* erişilemeyen cihaz, yine de kaydet */ }

    upsertPeer({ id, ip, port, autoSync: false });
    return reply.code(201).send({ id, ip, port, autoSync: false, status, reachable: status !== null });
  });

  // DELETE /api/peers/:id — cihaz sil
  fastify.delete<{ Params: { id: string } }>('/api/peers/:id', async (request, reply) => {
    deletePeer(decodeURIComponent(request.params.id));
    return reply.send({ ok: true });
  });

  // PATCH /api/peers/:id — autoSync toggle
  fastify.patch<{ Params: { id: string }; Body: UpdatePeerRequest }>('/api/peers/:id', async (request, reply) => {
    const { autoSync } = request.body;
    if (typeof autoSync !== 'boolean') return reply.code(400).send({ error: 'autoSync (boolean) gerekli' });
    updatePeerAutoSync(decodeURIComponent(request.params.id), autoSync);
    return reply.send({ ok: true, autoSync });
  });
};
