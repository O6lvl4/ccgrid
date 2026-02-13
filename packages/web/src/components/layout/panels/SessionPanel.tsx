import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { useApi } from '../../../hooks/useApi';
import { timeAgo } from '../../../utils/timeAgo';
import { NewSessionDialog } from '../../dialogs/NewSessionDialog';

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

// ---- Session item with context menu ----

function SessionItem({
  id,
  name,
  status,
  createdAt,
  isActive,
  dotColor,
  dotPulse,
  isRenaming,
  menuOpen,
  onNavigate,
  onMenuToggle,
  onMenuClose,
  onRenameStart,
  onRenameEnd,
  onDelete,
}: {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  isActive: boolean;
  dotColor: string;
  dotPulse?: boolean;
  isRenaming: boolean;
  menuOpen: boolean;
  onNavigate: () => void;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onRenameStart: () => void;
  onRenameEnd: (newName: string | null) => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(name);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onMenuClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen, onMenuClose]);

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      setDraft(name);
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming, name]);

  const commitRename = () => {
    const trimmed = draft.trim();
    onRenameEnd(trimmed || null);
  };

  return (
    <div
      role="button"
      onClick={() => { if (!isRenaming) onNavigate(); }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 12,
        cursor: 'pointer',
        background: isActive ? '#f0f7ff' : hovered ? '#f9fafb' : 'transparent',
        marginBottom: 2,
        transition: 'background 0.18s',
        position: 'relative',
        borderLeft: isActive ? '3px solid #0ab9e6' : '3px solid transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={dotPulse ? 'animate-pulse' : undefined}
        style={{
          width: 7,
          height: 7,
          minWidth: 7,
          minHeight: 7,
          borderRadius: '50%',
          backgroundColor: dotColor,
          marginTop: 5,
          flexShrink: 0,
          boxShadow: dotPulse ? `0 0 6px ${dotColor}` : 'none',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {isRenaming ? (
          <input
            ref={renameRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') onRenameEnd(null);
            }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              fontSize: 13,
              fontWeight: 600,
              color: '#1a1d24',
              border: 'none',
              borderBottom: '2px solid #0ab9e6',
              outline: 'none',
              background: 'transparent',
              padding: 0,
              lineHeight: 1.3,
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <div
            style={{
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#1a1d24' : '#3c4257',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.3,
            }}
          >
            {name}
          </div>
        )}
        <div style={{
          fontSize: 11,
          color: '#b0b8c4',
          marginTop: 3,
          lineHeight: 1,
          letterSpacing: 0.1,
        }}>
          {status} · {timeAgo(createdAt)}
        </div>
      </div>

      {(hovered || menuOpen) && !isRenaming && (
        <button
          onClick={e => { e.stopPropagation(); onMenuToggle(); }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 12,
            border: 'none',
            background: menuOpen ? '#e8eaed' : 'transparent',
            color: '#8b95a3',
            fontSize: 14,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 0,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#e8eaed'; e.currentTarget.style.color = '#555e6b'; }}
          onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b95a3'; }}
        >
          ···
        </button>
      )}

      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: 32,
            right: 8,
            zIndex: 100,
            background: '#ffffff',
            border: '1px solid #f0f1f3',
            borderRadius: 12,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)',
            padding: '4px 0',
            minWidth: 130,
            overflow: 'hidden',
          }}
        >
          <MenuItem label="Rename" onClick={e => { e.stopPropagation(); onRenameStart(); }} />
          <MenuItem label="Delete" danger onClick={e => { e.stopPropagation(); onDelete(); }} />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  label,
  danger,
  onClick,
}: {
  label: string;
  danger?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        padding: '8px 14px',
        border: 'none',
        background: 'transparent',
        color: danger ? '#ef4444' : '#3c4257',
        fontSize: 13,
        fontWeight: 500,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? '#fff5f5' : '#f7f8fa'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {label}
    </button>
  );
}
