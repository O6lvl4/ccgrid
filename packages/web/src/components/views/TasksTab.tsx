import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import type { TeamTask, Teammate } from '@ccgrid/shared';

const COLUMNS: { key: TeamTask['status']; label: string; color: string; bg: string }[] = [
  { key: 'pending', label: 'To Do', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'in_progress', label: 'In Progress', color: '#2563eb', bg: '#eff6ff' },
  { key: 'completed', label: 'Done', color: '#16a34a', bg: '#f0fdf4' },
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

  // Build agentId -> Teammate lookup for this session
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
        <span style={{ color: '#9ca3af', fontSize: 13 }}>
          Tasks will appear here as the lead creates them.
        </span>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      overflow: 'hidden',
      padding: '12px 16px',
      background: '#f8f9fa',
    }}>
      <div style={{
        display: 'flex',
        gap: 12,
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
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
              }}
            >
              {/* Column header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 14px',
                borderBottom: '1px solid #f0f0f0',
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: col.color,
                  background: col.bg,
                  padding: '3px 10px',
                  borderRadius: 99,
                }}>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: col.color,
                    flexShrink: 0,
                  }} />
                  {col.label}
                </span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#9ca3af',
                  marginLeft: 'auto',
                }}>
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px 10px',
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
                      padding: '24px 12px',
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
  // subject is used as the agent role name in team tasks
  const assigneeName = teammate?.name ?? task.assignedAgentId ?? task.subject;

  return (
    <div
      role="button"
      onClick={onClick}
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '10px 12px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        transition: 'box-shadow 0.15s, border-color 0.15s',
        borderLeft: `3px solid ${columnColor}`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        e.currentTarget.style.borderColor = '#d1d5db';
        e.currentTarget.style.borderLeftColor = columnColor;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.borderLeftColor = columnColor;
      }}
    >
      {/* Title */}
      <div style={{
        fontSize: 13,
        fontWeight: 500,
        color: '#111827',
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
          color: '#6b7280',
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
        {/* Dependencies */}
        {task.blockedBy.length > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 10,
            color: '#ef4444',
            background: '#fef2f2',
            padding: '2px 6px',
            borderRadius: 4,
            fontWeight: 500,
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
            color: '#2563eb',
            background: '#eff6ff',
            padding: '2px 6px',
            borderRadius: 4,
            fontWeight: 500,
          }}>
            Blocks {task.blocks.length}
          </span>
        )}

        {/* Assignee avatar */}
        {assigneeName && (
          <div style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: avatarColor(task.assignedAgentId ?? task.subject),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: '#ffffff',
              flexShrink: 0,
            }}>
              {avatarInitial(assigneeName)}
            </div>
            <span style={{
              fontSize: 11,
              color: '#6b7280',
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
