import { useState, useRef, useEffect } from 'react';
import { timeAgo } from '../../../utils/timeAgo';

export function SessionItem({
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
        background: isActive ? '#f0f7ff' : (hovered ? '#f9fafb' : 'transparent'),
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
