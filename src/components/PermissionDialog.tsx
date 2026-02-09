import { useMemo } from 'react';
import { YStack, XStack, Text, Button, ScrollView } from 'tamagui';
import { useStore } from '../store/useStore';

export function PermissionDialog({ sessionId }: { sessionId: string }) {
  const pendingPermissions = useStore(s => s.pendingPermissions);
  const respondToPermission = useStore(s => s.respondToPermission);

  const requests = useMemo(
    () => Array.from(pendingPermissions.values()).filter(p => p.sessionId === sessionId),
    [pendingPermissions, sessionId],
  );

  if (requests.length === 0) return null;

  return (
    <YStack gap="$2" px="$4" py="$2">
      {requests.map(req => (
        <YStack
          key={req.requestId}
          bg="$yellow2"
          borderWidth={1}
          borderColor="$yellow6"
          rounded="$3"
          p="$3"
          gap="$2"
        >
          <XStack ai="center" gap="$2">
            <Text fontSize={12} fontWeight="700" color="$yellow11">
              Permission Request
            </Text>
            {req.agentId && (
              <Text fontSize={11} color="$gray8" fontFamily="monospace">
                agent: {req.agentId.slice(0, 8)}
              </Text>
            )}
          </XStack>

          <XStack gap="$2" items="baseline">
            <Text fontSize={11} color="$gray9" fontWeight="600" width={50}>Tool</Text>
            <Text fontSize={12} color="$gray12" fontFamily="monospace">{req.toolName}</Text>
          </XStack>

          {req.description && (
            <XStack gap="$2" items="baseline">
              <Text fontSize={11} color="$gray9" fontWeight="600" width={50}>Reason</Text>
              <Text fontSize={12} color="$gray11" flex={1}>{req.description}</Text>
            </XStack>
          )}

          <YStack>
            <Text fontSize={11} color="$gray9" fontWeight="600" mb="$1">Input</Text>
            <ScrollView
              horizontal={false}
              maxHeight={120}
              bg="$gray3"
              rounded="$2"
              p="$2"
            >
              <Text fontSize={11} fontFamily="monospace" color="$gray11" whiteSpace="pre-wrap">
                {JSON.stringify(req.input, null, 2)}
              </Text>
            </ScrollView>
          </YStack>

          <XStack gap="$2" jc="flex-end" mt="$1">
            <Button
              size="$2"
              bg="$gray5"
              color="$gray11"
              hoverStyle={{ bg: '$gray6' }}
              onPress={() => respondToPermission(req.requestId, 'deny', 'User denied')}
            >
              Deny
            </Button>
            <Button
              size="$2"
              bg="$green9"
              color="white"
              hoverStyle={{ bg: '$green8' }}
              onPress={() => respondToPermission(req.requestId, 'allow')}
            >
              Allow
            </Button>
          </XStack>
        </YStack>
      ))}
    </YStack>
  );
}
