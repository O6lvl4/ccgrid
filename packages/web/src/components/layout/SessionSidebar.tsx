import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useApi } from '../../hooks/useApi';
import { timeAgo } from '../../utils/timeAgo';

const STATUS_DOT: Record<string, { color: string; pulse?: boolean }> = {
  starting:  { color: '#eab308' },
  running:   { color: '#22c55e', pulse: true },
  completed: { color: '#6b7280' },
  error:     { color: '#ef4444' },
};

export function SessionSidebar() {
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

  return (
    <div
      role="complementary"
      style={{
        width: 240,
        background: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Sidebar header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px 10px',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', letterSpacing: 0.3 }}>
          Sessions
        </span>
        <button
          onClick={() => navigate({ view: 'session_list' })}
          title="New session"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            padding: 0,
            borderRadius: 6,
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            color: '#6b7280',
            fontSize: 16,
            cursor: 'pointer',
            lineHeight: '24px',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#f3f4f6';
            e.currentTarget.style.color = '#111827';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.color = '#6b7280';
          }}
        >
          +
        </button>
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
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
    </div>
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

  // Close menu on outside click
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

  // Focus rename input
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
        gap: 8,
        padding: '8px 10px',
        borderRadius: 6,
        cursor: 'pointer',
        background: isActive ? '#f3f4f6' : hovered ? '#f9fafb' : 'transparent',
        borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
        marginBottom: 2,
        transition: 'background 0.15s',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Status dot */}
      <div
        className={dotPulse ? 'animate-pulse' : undefined}
        style={{
          width: 6,
          height: 6,
          minWidth: 6,
          minHeight: 6,
          borderRadius: '50%',
          backgroundColor: dotColor,
          marginTop: 5,
          flexShrink: 0,
        }}
      />

      {/* Text block */}
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
              color: '#111827',
              border: 'none',
              borderBottom: '1px solid #3b82f6',
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
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#111827' : '#374151',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.3,
            }}
          >
            {name}
          </div>
        )}
        <div
          style={{
            fontSize: 11,
            color: '#9ca3af',
            marginTop: 2,
            lineHeight: 1,
          }}
        >
          {status} · {timeAgo(createdAt)}
        </div>
      </div>

      {/* 3-dot menu button */}
      {(hovered || menuOpen) && !isRenaming && (
        <button
          onClick={e => {
            e.stopPropagation();
            onMenuToggle();
          }}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: 4,
            border: 'none',
            background: menuOpen ? '#e5e7eb' : '#f3f4f6',
            color: '#6b7280',
            fontSize: 14,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 0,
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#e5e7eb';
          }}
          onMouseLeave={e => {
            if (!menuOpen) e.currentTarget.style.background = '#f3f4f6';
          }}
        >
          ⋯
        </button>
      )}

      {/* Popup menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: 28,
            right: 6,
            zIndex: 100,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            padding: '4px 0',
            minWidth: 120,
          }}
        >
          <MenuItem
            label="Rename"
            onClick={e => {
              e.stopPropagation();
              onRenameStart();
            }}
          />
          <MenuItem
            label="Delete"
            danger
            onClick={e => {
              e.stopPropagation();
              onDelete();
            }}
          />
        </div>
      )}
    </div>
  );
}

// ---- Menu item ----

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
        padding: '6px 12px',
        border: 'none',
        background: 'transparent',
        color: danger ? '#dc2626' : '#374151',
        fontSize: 12,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? '#fef2f2' : '#f3f4f6';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {label}
    </button>
  );
}
