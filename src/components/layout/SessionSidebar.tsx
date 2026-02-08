import { ScrollView, Separator, Text, XStack, YStack } from 'tamagui';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../StatusBadge';

export function SessionSidebar() {
  const sessions = useStore(s => s.sessions);
  const route = useStore(s => s.route);
  const navigate = useStore(s => s.navigate);

  const currentSessionId = 'sessionId' in route ? route.sessionId : null;

  const sessionList = Array.from(sessions.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <YStack
      role="complementary"
      width={200}
      bg="$gray2"
      borderRightWidth={1}
      borderRightColor="$gray4"
      shrink={0}
    >
      <XStack px="$3" py="$2" items="center">
        <Text fontSize={11} fontWeight="600" color="$gray8" textTransform="uppercase" letterSpacing={0.5}>
          Sessions
        </Text>
      </XStack>

      <ScrollView flex={1}>
        <YStack px="$2" gap={2}>
          {sessionList.map(s => {
            const isActive = s.id === currentSessionId;
            return (
              <XStack
                key={s.id}
                role="button"
                onPress={() =>
                  navigate({ view: 'session_detail', sessionId: s.id, tab: 'output' })
                }
                items="center"
                gap="$2"
                px="$2"
                py="$1.5"
                rounded="$2"
                cursor="pointer"
                bg={isActive ? '$gray4' : 'transparent'}
                hoverStyle={{ bg: isActive ? '$gray4' : '$gray3' }}
                borderLeftWidth={2}
                borderLeftColor={isActive ? '$blue9' : 'transparent'}
              >
                <StatusBadge status={s.status} showLabel={false} />
                <Text
                  fontSize={13}
                  color={isActive ? '$gray12' : '$gray11'}
                  numberOfLines={1}
                  flex={1}
                >
                  {s.name}
                </Text>
              </XStack>
            );
          })}
        </YStack>
      </ScrollView>

      <Separator borderColor="$gray4" />

      <YStack px="$2" py="$2">
        <XStack
          role="button"
          onPress={() => navigate({ view: 'session_list' })}
          px="$2"
          py="$1.5"
          rounded="$2"
          cursor="pointer"
          hoverStyle={{ bg: '$gray3' }}
        >
          <Text fontSize={13} color="$blue9" fontWeight="500">
            + New Session
          </Text>
        </XStack>
      </YStack>
    </YStack>
  );
}
