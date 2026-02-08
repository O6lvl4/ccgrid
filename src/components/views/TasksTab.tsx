import { useMemo } from 'react';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { useStore } from '../../store/useStore';
import type { TeamTask } from '../../../shared/types';

const COLUMNS: { key: TeamTask['status']; label: string; color: string }[] = [
  { key: 'pending', label: 'Pending', color: '$gray7' },
  { key: 'in_progress', label: 'In Progress', color: '$blue9' },
  { key: 'completed', label: 'Done', color: '$green9' },
];

export function TasksTab({ sessionId }: { sessionId: string }) {
  const tasksMap = useStore(s => s.tasks);
  const navigate = useStore(s => s.navigate);

  const tasks = useMemo(() => tasksMap.get(sessionId) ?? [], [tasksMap, sessionId]);

  const grouped = useMemo(() => {
    const map: Record<string, TeamTask[]> = { pending: [], in_progress: [], completed: [] };
    for (const task of tasks) {
      (map[task.status] ?? map.pending).push(task);
    }
    return map;
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <YStack flex={1} items="center" justify="center">
        <Text color="$gray7" fontSize={13}>
          Tasks will appear here as the lead creates them.
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} overflow="hidden" p="$3">
      <XStack flex={1} gap="$3" overflow="hidden">
        {COLUMNS.map(col => (
          <YStack key={col.key} flex={1} minHeight={0}>
            {/* Column header */}
            <XStack items="center" gap="$1.5" mb="$2">
              <YStack width={8} height={8} rounded={100} bg={col.color as any} />
              <Text fontSize={11} fontWeight="600" color="$gray9" textTransform="uppercase" letterSpacing={0.3}>
                {col.label}
              </Text>
              <Text fontSize={11} color="$gray7">
                {grouped[col.key].length}
              </Text>
            </XStack>

            <ScrollView flex={1}>
              <YStack gap="$1.5">
                {grouped[col.key].map(task => {
                  const depCount = task.blockedBy.length + task.blocks.length;
                  return (
                    <YStack
                      key={task.id}
                      tag="button"
                      onPress={() => navigate({ view: 'task_detail', sessionId, taskId: task.id })}
                      bg="$gray2"
                      borderWidth={1}
                      borderColor="$gray4"
                      hoverStyle={{ borderColor: '$gray6' }}
                      rounded="$3"
                      p="$2.5"
                      cursor="pointer"
                      gap="$1"
                    >
                      <XStack items="center" gap="$1.5">
                        <Text fontSize={12} fontWeight="500" color="$gray12" numberOfLines={1} flex={1}>
                          {task.subject}
                        </Text>
                        {depCount > 0 && (
                          <XStack shrink={0} gap="$0.5">
                            {task.blockedBy.length > 0 && (
                              <Text fontSize={10} color="$red9" opacity={0.8}>
                                {task.blockedBy.length}{'\u2191'}
                              </Text>
                            )}
                            {task.blocks.length > 0 && (
                              <Text fontSize={10} color="$blue9" opacity={0.8}>
                                {task.blocks.length}{'\u2193'}
                              </Text>
                            )}
                          </XStack>
                        )}
                      </XStack>
                      {task.description && (
                        <Text fontSize={11} color="$gray9" numberOfLines={2} lineHeight={16}>
                          {task.description}
                        </Text>
                      )}
                      {task.assignedAgentId && (
                        <Text fontSize={10} color="$gray7" fontFamily="$mono">
                          {task.assignedAgentId.slice(0, 12)}
                        </Text>
                      )}
                    </YStack>
                  );
                })}
              </YStack>
            </ScrollView>
          </YStack>
        ))}
      </XStack>
    </YStack>
  );
}
