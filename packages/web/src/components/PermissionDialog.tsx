import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { PermissionCard } from './PermissionCard';
import type { PermissionLogEntry } from '@ccgrid/shared';

const EMPTY_HISTORY: PermissionLogEntry[] = [];

export function PermissionDialog({ sessionId }: { sessionId: string }) {
  const pendingPermissions = useStore(s => s.pendingPermissions);
  const respondToPermission = useStore(s => s.respondToPermission);

  const requests = useMemo(
    () => Array.from(pendingPermissions.values()).filter(p => p.sessionId === sessionId),
    [pendingPermissions, sessionId],
  );

  if (requests.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 480,
        maxHeight: '60vh',
        overflow: 'auto',
      }}
    >
      {requests.map(req => (
        <PermissionCard
          key={req.requestId}
          req={req}
          onRespond={respondToPermission}
          sessionId={sessionId}
        />
      ))}
    </div>
  );
}

export function PermissionBadge({ sessionId }: { sessionId: string }) {
  const pendingPermissions = useStore(s => s.pendingPermissions);
  const count = useMemo(
    () => Array.from(pendingPermissions.values()).filter(p => p.sessionId === sessionId).length,
    [pendingPermissions, sessionId],
  );

  if (count === 0) return null;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 10,
        background: '#fbbf24',
        color: '#78350f',
        fontSize: 11,
        fontWeight: 700,
        animation: 'pulse-badge 1.5s ease-in-out infinite',
      }}
    >
      <span style={{ fontSize: 13 }}>!</span>
      {count} permission{count > 1 ? 's' : ''} pending
      <style>{`
        @keyframes pulse-badge {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </span>
  );
}

export function PermissionHistory({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const history = useStore(s => s.permissionHistory.get(sessionId) ?? EMPTY_HISTORY);

  if (history.length === 0) return null;

  return (
    <div style={{ padding: 10 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          padding: '4px 0',
        }}
      >
        <span style={{ fontSize: 11, color: '#8b95a3', userSelect: 'none' }}>
          {open ? '\u25BC' : '\u25B6'}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#8b95a3' }}>
          Permission History ({history.length})
        </span>
      </div>
      {open && (
        <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[...history].reverse().map(entry => (
              <PermissionLogRow key={entry.requestId} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PermissionLogRow({ entry }: { entry: PermissionLogEntry }) {
  const colorMap: Record<string, { bg: string; fg: string }> = {
    allow: { bg: '#dcfce7', fg: '#166534' },
    auto: { bg: '#dbeafe', fg: '#1e40af' },
    deny: { bg: '#fef2f2', fg: '#991b1b' },
  };
  const colors = colorMap[entry.behavior] ?? colorMap.deny;
  const label = entry.behavior === 'auto' ? `auto (${entry.rule ?? 'rule'})` : entry.behavior;
  const time = new Date(entry.timestamp).toLocaleTimeString();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 10px',
      background: colors.bg,
      borderRadius: 8,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: colors.fg, width: 40, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#555e6b', flex: 1 }}>{entry.toolName}</span>
      {entry.agentId && (
        <span style={{ fontSize: 10, color: '#8b95a3', fontFamily: 'monospace' }}>{entry.agentId.slice(0, 6)}</span>
      )}
      <span style={{ fontSize: 10, color: '#8b95a3' }}>{time}</span>
    </div>
  );
}
