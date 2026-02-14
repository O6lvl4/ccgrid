import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/shallow';
import type { TeamTask, Teammate } from '@ccgrid/shared';
import { TaskCard } from './TaskCard';

const COLUMNS: { key: TeamTask['status']; label: string; color: string; bg: string }[] = [
  { key: 'pending', label: 'To Do', color: '#8b95a3', bg: '#f0f1f3' },
  { key: 'in_progress', label: 'In Progress', color: '#0ab9e6', bg: 'rgba(10,185,230,0.08)' },
  { key: 'completed', label: 'Done', color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
];

const EMPTY_TASKS: TeamTask[] = [];

export function TasksTab({ sessionId }: { sessionId: string }) {
  const rawTasks = useStore(s => s.tasks.get(sessionId) ?? EMPTY_TASKS);
  const session = useStore(s => s.sessions.get(sessionId));
  const navigate = useStore(s => s.navigate);

  const teammateMap = useStore(useShallow((s) => {
    const map = new Map<string, Teammate>();
    for (const tm of s.teammates.values()) {
      if (tm.sessionId === sessionId) map.set(tm.agentId, tm);
    }
    return map;
  }));

  const sessionDone = session?.status === 'completed' || session?.status === 'error';

  const tasks = useMemo(() => {
    if (!sessionDone) return rawTasks;
    return rawTasks.map(t =>
      t.status === 'pending' || t.status === 'in_progress'
        ? { ...t, status: 'completed' as const }
        : t,
    );
  }, [rawTasks, sessionDone]);

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
