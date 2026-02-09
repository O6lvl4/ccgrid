import { XStack, Text } from 'tamagui';
import { useStore } from '../../store/useStore';
import type { ViewRoute } from '../../store/useStore';

export function Breadcrumb() {
  const route = useStore(s => s.route);
  const sessions = useStore(s => s.sessions);
  const teammates = useStore(s => s.teammates);
  const tasks = useStore(s => s.tasks);
  const teammateSpecs = useStore(s => s.teammateSpecs);
  const navigate = useStore(s => s.navigate);

  const crumbs: { label: string; route?: ViewRoute }[] = [];

  if (route.view === 'teammate_spec_list' || route.view === 'teammate_spec_detail') {
    if (route.view === 'teammate_spec_detail') {
      const spec = teammateSpecs.find(s => s.id === route.specId);
      crumbs.push({ label: spec?.name ?? route.specId.slice(0, 8) });
    }
  } else if (route.view !== 'session_list') {
    const sid = route.sessionId;
    const session = sessions.get(sid);
    crumbs.push({
      label: session?.name ?? sid.slice(0, 8),
      route: { view: 'session_detail', sessionId: sid, tab: 'output' },
    });

    if (route.view === 'teammate_detail') {
      const tm = teammates.get(route.agentId);
      crumbs.push({ label: tm?.name ?? route.agentId.slice(0, 8) });
    } else if (route.view === 'task_detail') {
      const sessionTasks = tasks.get(sid) ?? [];
      const task = sessionTasks.find(t => t.id === route.taskId);
      crumbs.push({ label: task?.subject ?? `#${route.taskId}` });
    }
  }

  if (crumbs.length === 0) return null;

  return (
    <XStack role="navigation" ai="center" gap="$1">
      {crumbs.map((c, i) => (
        <XStack key={i} ai="center" gap="$1">
          {i > 0 && (
            <Text fontSize={11} color="$gray6">›</Text>
          )}
          {c.route ? (
            <Text
              role="link"
              fontSize={11}
              color="$gray9"
              cursor="pointer"
              hoverStyle={{ color: '$gray12' }}
              onPress={() => navigate(c.route!)}
            >
              {c.label}
            </Text>
          ) : (
            <Text fontSize={11} color="$gray11" fontWeight="500">
              {c.label}
            </Text>
          )}
        </XStack>
      ))}
    </XStack>
  );
}
