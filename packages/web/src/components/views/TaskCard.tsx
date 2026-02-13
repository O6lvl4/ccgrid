import type { TeamTask, Teammate } from '@ccgrid/shared';

const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#6366f1', '#ef4444', '#14b8a6', '#f97316',
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function avatarInitial(name: string): string {
  return (name[0] ?? '?').toUpperCase();
}

export function TaskCard({ task, columnColor, teammate, onClick }: {
  task: TeamTask;
  columnColor: string;
  teammate?: Teammate;
  onClick: () => void;
}) {
  const assigneeName = teammate?.name ?? task.assignedAgentId ?? task.subject;

  return (
    <div
      role="button"
      onClick={onClick}
      style={{
        background: '#ffffff',
        border: '1px solid #f0f1f3',
        borderRadius: 12,
        padding: '12px 14px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        transition: 'box-shadow 0.18s, border-color 0.18s, transform 0.12s',
        borderLeft: `3px solid ${columnColor}`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: '#1a1d24',
        lineHeight: 1.4,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {task.subject}
      </div>

      {task.description && (
        <div style={{
          fontSize: 11,
          color: '#8b95a3',
          lineHeight: 1.5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {task.description}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        {task.blockedBy.length > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 10,
            color: '#ef4444',
            background: '#fff5f5',
            padding: '3px 8px',
            borderRadius: 8,
            fontWeight: 600,
          }}>
            Blocked {task.blockedBy.length}
          </span>
        )}
        {task.blocks.length > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 10,
            color: '#0ab9e6',
            background: 'rgba(10,185,230,0.08)',
            padding: '3px 8px',
            borderRadius: 8,
            fontWeight: 600,
          }}>
            Blocks {task.blocks.length}
          </span>
        )}

        {assigneeName && (
          <div style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <div style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              background: avatarColor(task.assignedAgentId ?? task.subject),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 800,
              color: '#ffffff',
              flexShrink: 0,
            }}>
              {avatarInitial(assigneeName)}
            </div>
            <span style={{
              fontSize: 11,
              color: '#8b95a3',
              fontWeight: 500,
              maxWidth: 90,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {assigneeName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
