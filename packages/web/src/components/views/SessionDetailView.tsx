import { useMemo, useState, useEffect, memo } from 'react';
import { useStore, type SessionTab } from '../../store/useStore';
import { InlineEdit } from '../InlineEdit';
import { StatusBadge } from '../StatusBadge';
import { OutputTab } from './OutputTab';
import { OverviewTab } from './OverviewTab';
import { TeammatesTab } from './TeammatesTab';
import { TasksTab } from './TasksTab';
import { PermissionDialog, PermissionBadge, PermissionHistory } from '../PermissionDialog';
import type { Api } from '../../hooks/useApi';
import type { TeamTask } from '@ccgrid/shared';

const SKELETON_CARDS: number[][] = [
  [92, 78, 85, 60],
  [80, 65, 90, 50],
  [70, 88, 55, 82],
];

function SkeletonCard({ lines, delay }: { lines: number[]; delay: number }) {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      backgroundColor: '#ffffff',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f0f1f3' }} />
        <div style={{ width: 40, height: 12, borderRadius: 4, background: '#f0f1f3' }} />
      </div>
      <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lines.map((w, i) => (
          <div key={i} className="skeleton-pulse" style={{ height: 12, borderRadius: 4, background: '#f0f1f3', width: `${w}%`, animationDelay: `${(delay + i) * 0.1}s` }} />
        ))}
      </div>
    </div>
  );
}

function OutputSkeleton() {
  let delay = 0;
  return (
    <div style={{ flex: 1, padding: 16, backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {SKELETON_CARDS.map((lines, i) => {
        const d = delay;
        delay += lines.length;
        return <SkeletonCard key={i} lines={lines} delay={d} />;
      })}
      <style>{`
        .skeleton-pulse {
          animation: skeleton-fade 1.2s ease-in-out infinite;
        }
        @keyframes skeleton-fade {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const TABS: { key: SessionTab; label: string }[] = [
  { key: 'output', label: 'Output' },
  { key: 'teammates', label: 'Teammates' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'overview', label: 'Overview' },
];

const EMPTY_TASKS: TeamTask[] = [];

function ToastStack() {
  const toasts = useStore(s => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 900,
      display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360,
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '10px 16px', borderRadius: 12,
          background: t.type === 'success' ? '#ecfdf5' : '#eff6ff',
          border: `1px solid ${t.type === 'success' ? '#86efac' : '#93c5fd'}`,
          color: t.type === 'success' ? '#065f46' : '#1e40af',
          fontSize: 12, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          animation: 'toast-in 0.2s ease-out',
        }}>
          {t.type === 'success' ? '\u2713 ' : ''}{t.message}
        </div>
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

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
