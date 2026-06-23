import type { WebSocket } from '@fastify/websocket';
import type { WsMessage } from '@lan-sync/shared';

const clients = new Set<WebSocket>();

export function addClient(ws: WebSocket): void {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
}

export function broadcast(msg: WsMessage): void {
  const json = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === 1) { // OPEN
      ws.send(json);
    }
  }
}
