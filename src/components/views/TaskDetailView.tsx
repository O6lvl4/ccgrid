import { useEffect, useMemo } from 'react';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../StatusBadge';

function SectionLabel({ children }: { children: string }) {
  return (
    <Text fontSize={11} fontWeight="600" color="$gray8" textTransform="uppercase" letterSpacing={0.5}>
      {children}
    </Text>
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
      <YStack gap="$2">
        <SectionLabel>{label}</SectionLabel>
        <YStack gap="$1.5">
          {ids.map(id => {
            const dep = allTasks.find(t => t.id === id);
            return (
              <XStack
                key={id}
                bg="$gray2"
                borderWidth={1}
                borderColor="$gray4"
                rounded="$3"
                p="$2.5"
                hoverStyle={{ borderColor: '$gray6' }}
                cursor="pointer"
                onPress={() => navigate({ view: 'task_detail', sessionId, taskId: id })}
                items="center"
                gap="$2"
              >
                {dep ? (
                  <>
                    <StatusBadge status={dep.status} />
                    <Text fontSize={13} color="$gray11" numberOfLines={1} flex={1}>{dep.subject}</Text>
                  </>
                ) : (
                  <Text fontSize={12} color="$gray9" fontFamily="$mono">#{id}</Text>
                )}
              </XStack>
            );
          })}
        </YStack>
      </YStack>
    );
  };

  return (
    <YStack flex={1} overflow="hidden">
      {/* Header */}
      <XStack
        px="$4"
        py="$2"
        bg="$gray2"
        borderBottomWidth={1}
        borderBottomColor="$gray4"
        shrink={0}
        items="center"
        gap="$3"
      >
        <Text
          fontSize={12}
          color="$gray9"
          cursor="pointer"
          hoverStyle={{ color: '$gray12' }}
          onPress={goBack}
        >
          &larr; Back
        </Text>
        <Text fontWeight="700" fontSize={15} color="$gray12">{task.subject}</Text>
        <StatusBadge status={task.status} />
      </XStack>

      {/* Content */}
      <ScrollView flex={1}>
        <YStack p="$4" gap="$4" maxWidth={640} alignSelf="center" width="100%">
          {/* Description */}
          {task.description && (
            <YStack gap="$2">
              <SectionLabel>Description</SectionLabel>
              <YStack bg="$gray2" borderColor="$gray4" borderWidth={1} rounded="$3" p="$3">
                <Text fontSize={13} color="$gray11" whiteSpace="pre-wrap" lineHeight={20}>
                  {task.description}
                </Text>
              </YStack>
            </YStack>
          )}

          {/* Assigned agent */}
          {task.assignedAgentId && (
            <YStack gap="$2">
              <SectionLabel>Assigned To</SectionLabel>
              <XStack
                bg="$gray2"
                borderColor="$gray4"
                borderWidth={1}
                rounded="$3"
                p="$2.5"
                hoverStyle={{ borderColor: '$gray6' }}
                cursor="pointer"
                onPress={() => navigate({ view: 'teammate_detail', sessionId, agentId: task.assignedAgentId! })}
                items="center"
                gap="$2"
              >
                {assignedTm && <StatusBadge status={assignedTm.status} />}
                <Text fontSize={13} color="$gray12" fontWeight="500">
                  {assignedTm?.name ?? task.assignedAgentId.slice(0, 12)}
                </Text>
                {assignedTm?.agentType && (
                  <Text fontSize={11} color="$gray8">{assignedTm.agentType}</Text>
                )}
              </XStack>
            </YStack>
          )}

          {/* Dependencies */}
          {renderDepList('Blocked By', task.blockedBy)}
          {renderDepList('Blocks', task.blocks)}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
