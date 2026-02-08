import { Text, XStack, YStack } from 'tamagui';
import type { TeamTask } from '../../shared/types';

interface TaskCardProps {
  task: TeamTask;
  isExpanded: boolean;
  onToggle: () => void;
}

export function TaskCard({ task, isExpanded, onToggle }: TaskCardProps) {
  const depCount = task.blockedBy.length + task.blocks.length;

  return (
    <YStack
      px="$2"
      py="$1.5"
      rounded="$2"
      bg="$gray8"
      cursor="pointer"
      hoverStyle={{ bg: '$gray7' }}
      onPress={onToggle}
      {...(isExpanded
        ? { borderWidth: 1, borderColor: '$blue6' }
        : {})}
    >
      <XStack items="center" gap="$1.5">
        <Text
          fontSize={12}
          fontWeight="500"
          color="$gray2"
          numberOfLines={1}
          flex={1}
        >
          {task.subject}
        </Text>
        {depCount > 0 && (
          <XStack shrink={0}>
            {task.blockedBy.length > 0 && (
              <Text fontSize={10} color="$red4" opacity={0.7}>
                {task.blockedBy.length}&#8593;
              </Text>
            )}
            {task.blocks.length > 0 && (
              <Text fontSize={10} color="$blue4" opacity={0.7} ml="$0.5">
                {task.blocks.length}&#8595;
              </Text>
            )}
          </XStack>
        )}
      </XStack>
      {task.description && (
        <Text fontSize={12} color="$gray5" mt="$0.5" numberOfLines={1}>
          {task.description}
        </Text>
      )}
      {task.assignedAgentId && (
        <Text fontSize={12} color="$gray5" mt="$0.5" fontFamily="$mono">
          {task.assignedAgentId.slice(0, 8)}
        </Text>
      )}
    </YStack>
  );
}
