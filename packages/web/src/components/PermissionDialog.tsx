import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { useApi } from '../hooks/useApi';
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

/** Badge to show in the header when there are pending permissions */
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

function PermissionCard({
  req,
  onRespond,
}: {
  req: { requestId: string; toolName: string; input: Record<string, unknown>; description?: string; agentId?: string };
  onRespond: (requestId: string, behavior: 'allow' | 'deny', message?: string, updatedInput?: Record<string, unknown>) => void;
  sessionId: string;
}) {
  const api = useApi();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [parseError, setParseError] = useState(false);

  const handleEdit = () => {
    setEditValue(JSON.stringify(req.input, null, 2));
    setParseError(false);
    setEditing(true);
  };

  const handleChange = (value: string) => {
    setEditValue(value);
    try {
      JSON.parse(value);
      setParseError(false);
    } catch {
      setParseError(true);
    }
  };

  const handleAllow = () => {
    if (editing && !parseError) {
      try {
        const parsed = JSON.parse(editValue);
        const original = JSON.stringify(req.input);
        const edited = JSON.stringify(parsed);
        if (original !== edited) {
          onRespond(req.requestId, 'allow', undefined, parsed);
          return;
        }
      } catch { /* fall through to allow without edit */ }
    }
    onRespond(req.requestId, 'allow');
  };

  return (
    <div style={{
      background: '#fefce8',
      border: '1px solid #facc15',
      borderRadius: 16,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#a16207' }}>
          Permission Request
        </span>
        {req.agentId && (
          <span style={{ fontSize: 11, color: '#8b95a3', fontFamily: 'monospace' }}>
            agent: {req.agentId.slice(0, 8)}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <span style={{ fontSize: 11, color: '#8b95a3', fontWeight: 600, width: 50, flexShrink: 0 }}>Tool</span>
        <span style={{ fontSize: 12, color: '#1a1d24', fontFamily: 'monospace' }}>{req.toolName}</span>
      </div>

      {req.description && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, color: '#8b95a3', fontWeight: 600, width: 50, flexShrink: 0 }}>Reason</span>
          <span style={{ fontSize: 12, color: '#555e6b', flex: 1 }}>{req.description}</span>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#8b95a3', fontWeight: 600 }}>Input</span>
          {!editing ? (
            <button
              onClick={handleEdit}
              style={{
                background: 'none',
                border: 'none',
                color: '#0ab9e6',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => setEditing(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#8b95a3',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              Cancel
            </button>
          )}
        </div>

        {editing ? (
          <div>
            <textarea
              value={editValue}
              onChange={(e) => handleChange(e.target.value)}
              style={{
                fontFamily: 'monospace',
                fontSize: 11,
                padding: 10,
                borderRadius: 10,
                border: parseError ? '1px solid #ef4444' : '1px solid #e5e7eb',
                backgroundColor: parseError ? '#fef2f2' : '#f9fafb',
                minHeight: 80,
                maxHeight: 200,
                resize: 'vertical',
                width: '100%',
                boxSizing: 'border-box',
                outline: 'none',
                lineHeight: 1.5,
              }}
              onFocus={e => { if (!parseError) e.currentTarget.style.borderColor = '#0ab9e6'; }}
              onBlur={e => { if (!parseError) e.currentTarget.style.borderColor = '#e5e7eb'; }}
            />
            {parseError && (
              <span style={{ fontSize: 10, color: '#ef4444', marginTop: 4, display: 'block' }}>Invalid JSON</span>
            )}
          </div>
        ) : (
          <div style={{
            maxHeight: 120,
            overflow: 'auto',
            background: '#f9fafb',
            borderRadius: 10,
            padding: 10,
            border: '1px solid #f0f1f3',
          }}>
            <pre style={{
              fontSize: 11,
              fontFamily: 'monospace',
              color: '#555e6b',
              whiteSpace: 'pre-wrap',
              margin: 0,
              lineHeight: 1.5,
            }}>
              {JSON.stringify(req.input, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button
          onClick={() => onRespond(req.requestId, 'deny', 'User denied')}
          style={{
            padding: '6px 16px',
            borderRadius: 12,
            border: 'none',
            background: '#f3f4f6',
            color: '#555e6b',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; }}
        >
          Deny
        </button>
        <button
          onClick={() => {
            api.createPermissionRule({ toolName: req.toolName, behavior: 'allow' }).catch(console.error);
            handleAllow();
          }}
          style={{
            padding: '6px 16px',
            borderRadius: 12,
            border: 'none',
            background: '#0ab9e6',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
            boxShadow: '0 2px 8px rgba(10, 185, 230, 0.25)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#09a8d2'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#0ab9e6'; }}
        >
          Always Allow {req.toolName}
        </button>
        <button
          onClick={handleAllow}
          disabled={editing && parseError}
          style={{
            padding: '6px 16px',
            borderRadius: 12,
            border: 'none',
            background: editing && parseError ? '#e5e7eb' : '#16a34a',
            color: editing && parseError ? '#b0b8c4' : '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: editing && parseError ? 'default' : 'pointer',
            transition: 'background 0.15s',
            boxShadow: editing && parseError ? 'none' : '0 2px 8px rgba(22, 163, 74, 0.25)',
          }}
          onMouseEnter={e => { if (!(editing && parseError)) e.currentTarget.style.background = '#15803d'; }}
          onMouseLeave={e => { if (!(editing && parseError)) e.currentTarget.style.background = '#16a34a'; }}
        >
          Allow
        </button>
      </div>
    </div>
  );
}

/** Collapsible permission history for a session */
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
