import type { FastifyPluginAsync } from 'fastify';
import { addClient } from '../wsClients.js';

export const eventsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/events', { websocket: true }, (socket) => {
    addClient(socket);
    socket.send(JSON.stringify({ type: 'connected' }));
  });
};
