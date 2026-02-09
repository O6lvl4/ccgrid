import { useWebSocket } from './hooks/useWebSocket';
import { useApi } from './hooks/useApi';
import { useStore } from './store/useStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ViewShell } from './components/layout/ViewShell';
import { SessionListView } from './components/views/SessionListView';
import { SessionDetailView } from './components/views/SessionDetailView';
import { TeammateDetailView } from './components/views/TeammateDetailView';
import { TaskDetailView } from './components/views/TaskDetailView';
import { TeammateSpecListView } from './components/views/TeammateSpecListView';
import { TeammateSpecDetailView } from './components/views/TeammateSpecDetailView';
import { SkillSpecListView } from './components/views/SkillSpecListView';
import { SkillSpecDetailView } from './components/views/SkillSpecDetailView';

function AppInner() {
  useWebSocket();
  const api = useApi();
  const route = useStore(s => s.route);

  const renderView = () => {
    switch (route.view) {
      case 'session_list':
        return <SessionListView api={api} />;
      case 'session_detail':
        return <SessionDetailView sessionId={route.sessionId} tab={route.tab} api={api} />;
      case 'teammate_detail':
        return <TeammateDetailView sessionId={route.sessionId} agentId={route.agentId} />;
      case 'task_detail':
        return <TaskDetailView sessionId={route.sessionId} taskId={route.taskId} />;
      case 'teammate_spec_list':
        return <TeammateSpecListView api={api} />;
      case 'teammate_spec_detail':
        return <TeammateSpecDetailView specId={route.specId} api={api} />;
      case 'skill_spec_list':
        return <SkillSpecListView api={api} />;
      case 'skill_spec_detail':
        return <SkillSpecDetailView specId={route.specId} api={api} />;
    }
  };

  return (
    <ViewShell>
      {renderView()}
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
