import { useMemo } from 'react';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../StatusBadge';

export function TeammatesTab({ sessionId }: { sessionId: string }) {
  const teammates = useStore(s => s.teammates);
  const navigate = useStore(s => s.navigate);

  const tmList = useMemo(
    () => Array.from(teammates.values()).filter(t => t.sessionId === sessionId),
    [teammates, sessionId],
  );

  if (tmList.length === 0) {
    return (
      <YStack flex={1} items="center" justify="center">
        <Text color="$gray7" fontSize={13}>
          Teammates will appear here as the lead agent spawns them.
        </Text>
      </YStack>
    );
  }

  return (
    <ScrollView flex={1}>
      <YStack p="$4" gap="$2" maxWidth={640} alignSelf="center" width="100%">
        {tmList.map(tm => (
          <YStack
            key={tm.agentId}
            tag="button"
            onPress={() => navigate({ view: 'teammate_detail', sessionId, agentId: tm.agentId })}
            bg="$gray2"
            borderWidth={1}
            borderColor="$gray4"
            hoverStyle={{ borderColor: '$gray6' }}
            rounded="$3"
            p="$3"
            cursor="pointer"
            gap="$1.5"
          >
            <XStack items="center" gap="$2">
              <StatusBadge status={tm.status} />
              <Text fontWeight="600" fontSize={13} color="$gray12" numberOfLines={1} flex={1}>
                {tm.name ?? tm.agentId.slice(0, 8)}
              </Text>
              <Text fontSize={11} color="$gray8">{tm.agentType}</Text>
            </XStack>
            {tm.output ? (
              <Text fontSize={12} color="$gray9" numberOfLines={2} lineHeight={18}>
                {tm.output.slice(0, 200)}
              </Text>
            ) : (
              <Text fontSize={12} color="$gray7" fontStyle="italic">No output yet</Text>
            )}
          </YStack>
        ))}
      </YStack>
    </ScrollView>
  );
}
