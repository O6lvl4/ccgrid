import { useMemo } from 'react';
import { useStore, type SessionTab } from '../../store/useStore';
import { InlineEdit } from '../InlineEdit';
import { StatusBadge } from '../StatusBadge';
import { OutputTab } from './OutputTab';
import { OverviewTab } from './OverviewTab';
import { TeammatesTab } from './TeammatesTab';
import { TasksTab } from './TasksTab';
import { PermissionDialog, PermissionBadge } from '../PermissionDialog';
import type { Api } from '../../hooks/useApi';

const TABS: { key: SessionTab; label: string }[] = [
  { key: 'output', label: 'Output' },
  { key: 'teammates', label: 'Teammates' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'overview', label: 'Overview' },
];

export function SessionDetailView({ sessionId, tab, api }: { sessionId: string; tab: SessionTab; api: Api }) {
  const session = useStore(s => s.sessions.get(sessionId));
  const navigate = useStore(s => s.navigate);
  const patchSession = useStore(s => s.patchSession);
  const lastError = useStore(s => s.lastError);
  const clearError = useStore(s => s.clearError);
  const teammates = useStore(s => s.teammates);
  const tasks = useStore(s => s.tasks);

  const tmCount = useMemo(
    () => Array.from(teammates.values()).filter(t => t.sessionId === sessionId).length,
    [teammates, sessionId],
  );
  const taskList = useMemo(() => tasks.get(sessionId) ?? [], [tasks, sessionId]);
  const doneCount = useMemo(() => taskList.filter(t => t.status === 'completed').length, [taskList]);

  if (!session) return null;

  const isActive = session.status === 'running' || session.status === 'starting';

  const handleRename = (name: string) => {
    patchSession(sessionId, { name });
    api.updateSession(sessionId, { name }).catch(console.error);
  };

  const tabLabels: Record<SessionTab, string> = {
    output: 'Output',
    teammates: `Teammates (${tmCount})`,
    tasks: `Tasks (${doneCount}/${taskList.length})`,
    overview: 'Overview',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0,
        }}
      >
        {/* Info row 1: name + status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 20px 4px',
          }}
        >
          <InlineEdit value={session.name} onSave={handleRename} fontSize={16} fontWeight="700" />
          <StatusBadge status={session.status} />
          <PermissionBadge sessionId={sessionId} />
        </div>

        {/* Info row 2: metadata */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 20px 10px',
          }}
        >
          <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
            {session.model.split('-').slice(1, 3).join(' ')}
          </span>
          <span
            style={{
              fontSize: 11,
              color: '#9ca3af',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 260,
            }}
          >
            {session.cwd}
          </span>
          <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
            ${session.costUsd.toFixed(4)}
          </span>
          {isActive && (
            <button
              onClick={() => api.stopSession(sessionId).catch(console.error)}
              style={{
                marginLeft: 'auto',
                padding: '3px 10px',
                borderRadius: 4,
                border: '1px solid #fca5a5',
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                lineHeight: 1.3,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#fee2e2';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#fef2f2';
              }}
            >
              Stop
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, padding: '0 20px' }}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => navigate({ view: 'session_detail', sessionId, tab: t.key })}
                style={{
                  padding: '6px 14px 8px',
                  border: 'none',
                  borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
                  background: 'transparent',
                  color: active ? '#111827' : '#6b7280',
                  fontWeight: active ? 600 : 400,
                  fontSize: 12,
                  cursor: 'pointer',
                  lineHeight: 1,
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.color = '#111827';
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.color = '#6b7280';
                }}
              >
                {tabLabels[t.key]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error banner */}
      {lastError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 20px',
            background: '#fef2f2',
            borderBottom: '1px solid #fecaca',
          }}
        >
          <span style={{ flex: 1, fontSize: 12, color: '#dc2626' }}>{lastError}</span>
          <button
            onClick={clearError}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#ef4444',
              fontSize: 12,
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#dc2626';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#ef4444';
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Permission requests */}
      <PermissionDialog sessionId={sessionId} />

      {/* Tab content */}
      {tab === 'output' && <OutputTab sessionId={sessionId} />}
      {tab === 'overview' && <OverviewTab session={session} />}
      {tab === 'teammates' && <TeammatesTab sessionId={sessionId} />}
      {tab === 'tasks' && <TasksTab sessionId={sessionId} />}
    </div>
  );
}
