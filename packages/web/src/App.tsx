import { useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useApi } from './hooks/useApi';
import { useStore } from './store/useStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ViewShell } from './components/layout/ViewShell';
import { WelcomeView } from './components/views/WelcomeView';
import { SessionDetailView } from './components/views/SessionDetailView';
import { TeammateDetailView } from './components/views/TeammateDetailView';
import { TaskDetailView } from './components/views/TaskDetailView';
import { TeammateSpecDetailView } from './components/views/TeammateSpecDetailView';
import { SkillSpecDetailView } from './components/views/SkillSpecDetailView';

const MAX_CACHED_SESSIONS = 5;

function AppInner() {
  useWebSocket();
  const api = useApi();
  const route = useStore(s => s.route);

  // Cache visited session views — switching back is instant (DOM stays alive)
  const visitedRef = useRef(new Set<string>());
  const tabsRef = useRef(new Map<string, string>());
  if (route.view === 'session_detail') {
    visitedRef.current.add(route.sessionId);
    tabsRef.current.set(route.sessionId, route.tab);
    if (visitedRef.current.size > MAX_CACHED_SESSIONS) {
      const oldest = visitedRef.current.values().next().value!;
      visitedRef.current.delete(oldest);
      tabsRef.current.delete(oldest);
    }
  }

  const activeSessionId = route.view === 'session_detail' ? route.sessionId : null;
  const renderView = () => {
    switch (route.view) {
      case 'session_list':
      case 'teammate_spec_list':
      case 'skill_spec_list':
        return <WelcomeView />;
      case 'session_detail':
        return null; // Handled by cached views below
      case 'teammate_detail':
        return <TeammateDetailView sessionId={route.sessionId} agentId={route.agentId} />;
      case 'task_detail':
        return <TaskDetailView sessionId={route.sessionId} taskId={route.taskId} />;
      case 'teammate_spec_detail':
        return <TeammateSpecDetailView specId={route.specId} api={api} />;
      case 'skill_spec_detail':
        return <SkillSpecDetailView specId={route.specId} api={api} />;
    }
  };

  return (
    <ViewShell>
      {renderView()}
      {[...visitedRef.current].map(sid => (
        <div
          key={sid}
          style={{ display: activeSessionId === sid ? 'contents' : 'none' }}
        >
          <SessionDetailView
            sessionId={sid}
            tab={(tabsRef.current.get(sid) ?? 'output') as import('./store/useStore').SessionTab}
            api={api}
          />
        </div>
      ))}
    </ViewShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
