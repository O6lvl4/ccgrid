import { useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../StatusBadge';

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 800,
      color: '#8b95a3',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

export function TaskDetailView({ sessionId, taskId }: { sessionId: string; taskId: string }) {
  const tasksMap = useStore(s => s.tasks);
  const teammates = useStore(s => s.teammates);
  const navigate = useStore(s => s.navigate);
  const goBack = useStore(s => s.goBack);

  const allTasks = useMemo(() => tasksMap.get(sessionId) ?? [], [tasksMap, sessionId]);
  const task = useMemo(() => allTasks.find(t => t.id === taskId), [allTasks, taskId]);

  useEffect(() => {
    if (!task) navigate({ view: 'session_detail', sessionId, tab: 'tasks' });
  }, [task, navigate, sessionId]);

  if (!task) return null;

  const assignedTm = task.assignedAgentId ? teammates.get(task.assignedAgentId) : undefined;

  const renderDepList = (label: string, ids: string[]) => {
    if (ids.length === 0) return null;
    return (
      <div>
        <SectionLabel>{label}</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ids.map(id => {
            const dep = allTasks.find(t => t.id === id);
            return (
              <div
                key={id}
                onClick={() => navigate({ view: 'task_detail', sessionId, taskId: id })}
                style={{
                  background: '#f9fafb',
                  border: '1px solid #f0f1f3',
                  borderRadius: 12,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#e0e3e8'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0f1f3'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {dep ? (
                  <>
                    <StatusBadge status={dep.status} />
                    <span style={{
                      fontSize: 13,
                      color: '#3c4257',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {dep.subject}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: '#8b95a3', fontFamily: 'monospace' }}>#{id}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #f0f1f3',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: '#b0b8c4',
            cursor: 'pointer',
            lineHeight: 1,
            fontWeight: 600,
            transition: 'color 0.15s',
          }}
          onClick={goBack}
          onMouseEnter={e => { e.currentTarget.style.color = '#1a1d24'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#b0b8c4'; }}
        >
          ← Back
        </span>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#1a1d24', lineHeight: 1 }}>
          {task.subject}
        </span>
        <StatusBadge status={task.status} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          maxWidth: 640,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {/* Description */}
          {task.description && (
            <div>
              <SectionLabel>Description</SectionLabel>
              <div style={{
                background: '#f9fafb',
                border: '1px solid #f0f1f3',
                borderRadius: 14,
                padding: '14px 18px',
              }}>
                <p style={{
                  fontSize: 13,
                  color: '#3c4257',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {task.description}
                </p>
              </div>
            </div>
          )}

          {/* Assigned agent */}
          {task.assignedAgentId && (
            <div>
              <SectionLabel>Assigned To</SectionLabel>
              <div
                onClick={() => navigate({ view: 'teammate_detail', sessionId, agentId: task.assignedAgentId! })}
                style={{
                  background: '#f9fafb',
                  border: '1px solid #f0f1f3',
                  borderRadius: 12,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#e0e3e8'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0f1f3'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {assignedTm && <StatusBadge status={assignedTm.status} />}
                <span style={{ fontSize: 13, color: '#1a1d24', fontWeight: 600 }}>
                  {assignedTm?.name ?? task.assignedAgentId.slice(0, 12)}
                </span>
                {assignedTm?.agentType && (
                  <span style={{
                    fontSize: 11,
                    color: '#8b95a3',
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: 8,
                    background: '#f0f1f3',
                  }}>
                    {assignedTm.agentType}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {renderDepList('Blocked By', task.blockedBy)}
          {renderDepList('Blocks', task.blocks)}
        </div>
      </div>
    </div>
  );
}
