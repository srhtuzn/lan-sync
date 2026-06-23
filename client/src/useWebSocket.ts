import { useEffect, useCallback } from 'react';
import type { WsMessage } from '@lan-sync/shared';

export function useWebSocket(onMessage: (msg: WsMessage) => void): void {
  const stableOnMessage = useCallback(onMessage, []); // eslint-disable-line

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let destroyed = false;

    function connect(): void {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${location.host}/api/events`);

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data) as WsMessage;
          stableOnMessage(msg);
        } catch { /* ignore malformed */ }
      };

      ws.onclose = () => {
        if (!destroyed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    }

    connect();
    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [stableOnMessage]);
}
