import { useMemo } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { useStore, type SessionTab } from '../../store/useStore';
import { InlineEdit } from '../InlineEdit';
import { StatusBadge } from '../StatusBadge';
import { OutputTab } from './OutputTab';
import { OverviewTab } from './OverviewTab';
import { TeammatesTab } from './TeammatesTab';
import { TasksTab } from './TasksTab';
import { PermissionDialog } from '../PermissionDialog';
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
    <YStack flex={1} overflow="hidden">
      {/* Header */}
      <YStack bg="$gray2" borderBottomWidth={1} borderBottomColor="$gray4" shrink={0}>
        {/* Info row */}
        <XStack items="center" gap="$3" px="$4" pt="$2.5" pb="$1.5">
          <InlineEdit value={session.name} onSave={handleRename} fontSize={15} fontWeight="700" />
          <StatusBadge status={session.status} />
          <XStack gap="$2" items="center" marginLeft="auto" shrink={0}>
            <Text fontSize={11} color="$gray8" fontFamily="$mono">
              {session.model.split('-').slice(1, 3).join(' ')}
            </Text>
            <Text fontSize={11} color="$gray8" numberOfLines={1}>
              {session.cwd}
            </Text>
            <Text fontSize={11} color="$gray8" fontFamily="$mono">
              ${session.costUsd.toFixed(4)}
            </Text>
            {isActive && (
              <Text
                fontSize={11}
                color="$red9"
                cursor="pointer"
                fontWeight="600"
                hoverStyle={{ color: '$red10' }}
                onPress={() => api.stopSession(sessionId).catch(console.error)}
              >
                Stop
              </Text>
            )}
          </XStack>
        </XStack>

        {/* Tab bar */}
        <XStack gap="$1" px="$4">
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <YStack
                key={t.key}
                cursor="pointer"
                onPress={() => navigate({ view: 'session_detail', sessionId, tab: t.key })}
                pb="$1.5"
                borderBottomWidth={2}
                borderBottomColor={active ? '$blue9' : 'transparent'}
              >
                <Text
                  fontSize={12}
                  fontWeight={active ? '600' : '400'}
                  color={active ? '$gray12' : '$gray9'}
                  hoverStyle={{ color: '$gray12' }}
                  px="$1.5"
                >
                  {tabLabels[t.key]}
                </Text>
              </YStack>
            );
          })}
        </XStack>
      </YStack>

      {/* Error banner */}
      {lastError && (
        <XStack
          px="$4"
          py="$2"
          bg="$red3"
          borderBottomWidth={1}
          borderBottomColor="$red6"
          items="center"
          gap="$2"
        >
          <Text flex={1} fontSize={12} color="$red11">
            {lastError}
          </Text>
          <Text
            fontSize={12}
            cursor="pointer"
            onPress={clearError}
            color="$red9"
            hoverStyle={{ color: '$red11' }}
          >
            Dismiss
          </Text>
        </XStack>
      )}

      {/* Permission requests */}
      <PermissionDialog sessionId={sessionId} />

      {/* Tab content */}
      {tab === 'output' && <OutputTab sessionId={sessionId} />}
      {tab === 'overview' && <OverviewTab session={session} />}
      {tab === 'teammates' && <TeammatesTab sessionId={sessionId} />}
      {tab === 'tasks' && <TasksTab sessionId={sessionId} />}
    </YStack>
  );
}
