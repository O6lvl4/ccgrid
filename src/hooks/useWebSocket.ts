import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import type { ServerMessage } from '../../shared/types';

export function useWebSocket() {
  const handleServerMessage = useStore(s => s.handleServerMessage);
  const setWsSend = useStore(s => s.setWsSend);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let isClosed = false;

    function connect() {
      if (isClosed) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsSend((msg: unknown) => ws.send(JSON.stringify(msg)));
      };

      ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          handleServerMessage(msg);
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      ws.onclose = () => {
        setWsSend(null);
        if (!isClosed) {
          reconnectTimer.current = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        // onclose will fire after this
      };
    }

    connect();

    return () => {
      isClosed = true;
      setWsSend(null);
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [handleServerMessage, setWsSend]);
}
