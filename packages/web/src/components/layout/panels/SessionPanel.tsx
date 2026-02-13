import { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { useApi } from '../../../hooks/useApi';
import { NewSessionDialog } from '../../dialogs/NewSessionDialog';
import { SessionItem } from './SessionItem';

const STATUS_DOT: Record<string, { color: string; pulse?: boolean }> = {
  starting:  { color: '#eab308' },
  running:   { color: '#22c55e', pulse: true },
  completed: { color: '#8b95a3' },
  error:     { color: '#ef4444' },
};

export function SessionPanel() {
  const sessions = useStore(s => s.sessions);
  const route = useStore(s => s.route);
  const navigate = useStore(s => s.navigate);
  const patchSession = useStore(s => s.patchSession);
  const api = useApi();

  const currentSessionId = 'sessionId' in route ? route.sessionId : null;

  const sessionList = Array.from(sessions.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);

  return (
    <>
      {/* Panel header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 18px 12px',
          flexShrink: 0,
        }}
      >
        <span style={{
          fontSize: 11,
          fontWeight: 800,
          color: '#8b95a3',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}>
          Sessions
        </span>
        <button
          onClick={() => setShowNewSession(true)}
          title="New session"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            padding: 0,
            borderRadius: 13,
            border: 'none',
            background: '#0ab9e6',
            color: '#fff',
            cursor: 'pointer',
            transition: 'background 0.18s, transform 0.12s, box-shadow 0.18s',
            boxShadow: '0 2px 8px rgba(10, 185, 230, 0.3)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#09a8d2';
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 3px 12px rgba(10, 185, 230, 0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#0ab9e6';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(10, 185, 230, 0.3)';
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)'; }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
        {sessionList.map(s => {
          const isActive = s.id === currentSessionId;
          const dot = STATUS_DOT[s.status] ?? STATUS_DOT.completed;
          const isRenaming = renamingId === s.id;

          return (
            <SessionItem
              key={s.id}
              id={s.id}
              name={s.name}
              status={s.status}
              createdAt={s.createdAt}
              isActive={isActive}
              dotColor={dot.color}
              dotPulse={dot.pulse}
              isRenaming={isRenaming}
              menuOpen={menuOpenId === s.id}
              onNavigate={() =>
                navigate({ view: 'session_detail', sessionId: s.id, tab: 'output' })
              }
              onMenuToggle={() => setMenuOpenId(prev => (prev === s.id ? null : s.id))}
              onMenuClose={() => setMenuOpenId(null)}
              onRenameStart={() => {
                setMenuOpenId(null);
                setRenamingId(s.id);
              }}
              onRenameEnd={(newName) => {
                setRenamingId(null);
                if (newName && newName !== s.name) {
                  patchSession(s.id, { name: newName });
                  api.updateSession(s.id, { name: newName }).catch(console.error);
                }
              }}
              onDelete={() => {
                setMenuOpenId(null);
                api.deleteSession(s.id).catch(console.error);
              }}
            />
          );
        })}
      </div>

      {/* New session dialog */}
      <NewSessionDialog open={showNewSession} onClose={() => setShowNewSession(false)} />
    </>
  );
}
