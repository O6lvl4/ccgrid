import { useMemo, useState, useEffect, memo } from 'react';
import { useStore, type SessionTab } from '../../store/useStore';
import { InlineEdit } from '../InlineEdit';
import { StatusBadge } from '../StatusBadge';
import { OutputTab } from './OutputTab';
import { OverviewTab } from './OverviewTab';
import { TeammatesTab } from './TeammatesTab';
import { TasksTab } from './TasksTab';
import { PermissionDialog, PermissionBadge, PermissionHistory } from '../PermissionDialog';
import { OutputSkeleton } from './OutputSkeleton';
import { ToastStack } from './ToastStack';
import type { Api } from '../../hooks/useApi';
import type { TeamTask } from '@ccgrid/shared';

const TABS: { key: SessionTab; label: string }[] = [
  { key: 'output', label: 'Output' },
  { key: 'teammates', label: 'Teammates' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'overview', label: 'Overview' },
];

const EMPTY_TASKS: TeamTask[] = [];

export const SessionDetailView = memo(function SessionDetailView({ sessionId, tab, api }: { sessionId: string; tab: SessionTab; api: Api }) {
  const session = useStore(s => s.sessions.get(sessionId));
  const navigate = useStore(s => s.navigate);
  const patchSession = useStore(s => s.patchSession);
  const lastError = useStore(s => s.lastError);
  const clearError = useStore(s => s.clearError);

  // Derived selectors — return primitives/stable refs so unrelated updates don't trigger re-renders
  const tmCount = useStore(s => {
    let count = 0;
    for (const t of s.teammates.values()) {
      if (t.sessionId === sessionId) count++;
    }
    return count;
  });
  const taskList = useStore(s => s.tasks.get(sessionId) ?? EMPTY_TASKS);
  const doneCount = useMemo(() => taskList.filter(t => t.status === 'completed').length, [taskList]);

  // Defer heavy tab content to after first paint so header/title appears instantly
  const [contentReady, setContentReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setContentReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
          borderBottom: '1px solid #f0f1f3',
          flexShrink: 0,
        }}
      >
        {/* Info row 1: name + status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 24px 6px',
          }}
        >
          <InlineEdit value={session.name} onSave={handleRename} fontSize={16} fontWeight="800" />
          <StatusBadge status={session.status} />
          <PermissionBadge sessionId={sessionId} />
        </div>

        {/* Info row 2: metadata */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '2px 24px 12px',
          }}
        >
          <span style={{
            fontSize: 11,
            color: '#8b95a3',
            fontFamily: 'monospace',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 8,
            background: '#f7f8fa',
            letterSpacing: 0.3,
          }}>
            {session.model.split('-').slice(1, 3).join(' ')}
          </span>
          <span
            style={{
              fontSize: 11,
              color: '#b0b8c4',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 260,
              letterSpacing: 0.1,
            }}
          >
            {session.cwd}
          </span>
          <span style={{
            fontSize: 11,
            color: '#8b95a3',
            fontFamily: 'monospace',
            fontWeight: 600,
          }}>
            ${session.costUsd.toFixed(4)}
          </span>
          {isActive && (
            <button
              onClick={() => api.stopSession(sessionId).catch(console.error)}
              style={{
                marginLeft: 'auto',
                padding: '5px 14px',
                borderRadius: 14,
                border: 'none',
                background: '#fee2e2',
                color: '#ef4444',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                lineHeight: 1,
                letterSpacing: 0.3,
                transition: 'background 0.18s, transform 0.12s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#fecaca';
                e.currentTarget.style.transform = 'scale(1.04)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#fee2e2';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
            >
              Stop
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 2, padding: '0 20px' }}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => navigate({ view: 'session_detail', sessionId, tab: t.key })}
                style={{
                  padding: '8px 16px 10px',
                  border: 'none',
                  borderBottom: active ? '2px solid #0ab9e6' : '2px solid transparent',
                  background: 'transparent',
                  color: active ? '#1a1d24' : '#8b95a3',
                  fontWeight: active ? 700 : 500,
                  fontSize: 12,
                  letterSpacing: 0.3,
                  cursor: 'pointer',
                  lineHeight: 1,
                  transition: 'color 0.18s, border-color 0.18s',
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.color = '#555e6b';
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.color = '#8b95a3';
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
            gap: 10,
            padding: '10px 24px',
            background: '#fff5f5',
            borderBottom: '1px solid #fecaca',
          }}
        >
          <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#ef4444' }}>{lastError}</span>
          <button
            onClick={clearError}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#ef4444',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 10px',
              borderRadius: 10,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Permission requests + history */}
      <PermissionDialog sessionId={sessionId} />
      <PermissionHistory sessionId={sessionId} />

      {/* Tab content — deferred to after first paint for instant header switch */}
      {contentReady ? (
        <>
          <div style={{ display: tab === 'output' ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <OutputTab sessionId={sessionId} visible={tab === 'output'} />
          </div>
          {tab === 'overview' && <OverviewTab session={session} />}
          {tab === 'teammates' && <TeammatesTab sessionId={sessionId} />}
          {tab === 'tasks' && <TasksTab sessionId={sessionId} />}
        </>
      ) : (
        <OutputSkeleton />
      )}

      {/* Toast notifications */}
      <ToastStack />
    </div>
  );
});
