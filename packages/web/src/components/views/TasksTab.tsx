import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import type { TeamTask, Teammate } from '@ccgrid/shared';

const COLUMNS: { key: TeamTask['status']; label: string; color: string; bg: string }[] = [
  { key: 'pending', label: 'To Do', color: '#8b95a3', bg: '#f0f1f3' },
  { key: 'in_progress', label: 'In Progress', color: '#0ab9e6', bg: 'rgba(10,185,230,0.08)' },
  { key: 'completed', label: 'Done', color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
];

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

export function TasksTab({ sessionId }: { sessionId: string }) {
  const tasksMap = useStore(s => s.tasks);
  const session = useStore(s => s.sessions.get(sessionId));
  const teammates = useStore(s => s.teammates);
  const navigate = useStore(s => s.navigate);

  const sessionDone = session?.status === 'completed' || session?.status === 'error';

  const tasks = useMemo(() => {
    const raw = tasksMap.get(sessionId) ?? [];
    if (!sessionDone) return raw;
    return raw.map(t =>
      t.status === 'pending' || t.status === 'in_progress'
        ? { ...t, status: 'completed' as const }
        : t,
    );
  }, [tasksMap, sessionId, sessionDone]);

  const teammateMap = useMemo(() => {
    const map = new Map<string, Teammate>();
    for (const tm of teammates.values()) {
      if (tm.sessionId === sessionId) map.set(tm.agentId, tm);
    }
    return map;
  }, [teammates, sessionId]);

  const grouped = useMemo(() => {
    const map: Record<string, TeamTask[]> = { pending: [], in_progress: [], completed: [] };
    for (const task of tasks) {
      (map[task.status] ?? map.pending).push(task);
    }
    return map;
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#b0b8c4', fontSize: 13 }}>
          Tasks will appear here as the lead creates them.
        </span>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      overflow: 'hidden',
      padding: '14px 18px',
      background: '#f7f8fa',
    }}>
      <div style={{
        display: 'flex',
        gap: 14,
        height: '100%',
        overflow: 'hidden',
      }}>
        {COLUMNS.map(col => {
          const items = grouped[col.key];
          return (
            <div
              key={col.key}
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                background: '#ffffff',
                borderRadius: 16,
                border: '1px solid #f0f1f3',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              }}
            >
              {/* Column header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 16px',
                borderBottom: '1px solid #f0f1f3',
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color: col.color,
                  background: col.bg,
                  padding: '4px 12px',
                  borderRadius: 12,
                  letterSpacing: 0.3,
                }}>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: col.color,
                    flexShrink: 0,
                    boxShadow: col.key === 'in_progress' ? `0 0 6px ${col.color}` : 'none',
                  }} />
                  {col.label}
                </span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#b0b8c4',
                  marginLeft: 'auto',
                }}>
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      columnColor={col.color}
                      teammate={task.assignedAgentId ? teammateMap.get(task.assignedAgentId) : undefined}
                      onClick={() => navigate({ view: 'task_detail', sessionId, taskId: task.id })}
                    />
                  ))}
                  {items.length === 0 && (
                    <div style={{
                      padding: '28px 12px',
                      textAlign: 'center',
                      color: '#d1d5db',
                      fontSize: 12,
                    }}>
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({ task, columnColor, teammate, onClick }: {
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
      {/* Title */}
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

      {/* Description */}
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

      {/* Footer */}
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
