import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import type { ServerMessage, Session } from '@ccgrid/shared';

export function useWebSocket() {
  const handleServerMessage = useStore(s => s.handleServerMessage);
  const setWsSend = useStore(s => s.setWsSend);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pollTimer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    let isClosed = false;

    // running セッションの状態をポーリングで同期（取りこぼし対策）
    function startStatusPoller() {
      if (pollTimer.current) return;
      pollTimer.current = setInterval(async () => {
        const sessions = useStore.getState().sessions;
        for (const [id, session] of sessions) {
          if (session.status === 'running' || session.status === 'starting') {
            try {
              const res = await fetch(`/api/sessions/${id}`);
              if (!res.ok) continue;
              const latest: Session = await res.json();
              if (latest.status !== session.status) {
                handleServerMessage({ type: 'session_status', sessionId: id, status: latest.status } as ServerMessage);
              }
            } catch { /* ignore */ }
          }
        }
      }, 10000);
    }

    function stopStatusPoller() {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = undefined;
      }
    }

    function connect() {
      if (isClosed) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsSend((msg: unknown) => ws.send(JSON.stringify(msg)));
        startStatusPoller();
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

      ws.onerror = () => { void 0; };
    }

    connect();

    return () => {
      isClosed = true;
      setWsSend(null);
      stopStatusPoller();
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [handleServerMessage, setWsSend]);
}
