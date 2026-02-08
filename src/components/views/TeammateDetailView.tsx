import { useEffect } from 'react';
import Markdown from 'react-markdown';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../StatusBadge';

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <XStack gap="$3" items="center" py="$1">
      <Text fontSize={12} color="$gray8" width={80}>{label}</Text>
      <Text fontSize={13} color="$gray12" minWidth={0} flex={1}>{children}</Text>
    </XStack>
  );
}

export function TeammateDetailView({ sessionId, agentId }: { sessionId: string; agentId: string }) {
  const teammate = useStore(s => s.teammates.get(agentId));
  const navigate = useStore(s => s.navigate);
  const goBack = useStore(s => s.goBack);

  useEffect(() => {
    if (!teammate) navigate({ view: 'session_detail', sessionId, tab: 'teammates' });
  }, [teammate, navigate, sessionId]);

  if (!teammate) return null;

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
        <Text fontWeight="700" fontSize={15} color="$gray12">
          {teammate.name ?? teammate.agentId.slice(0, 8)}
        </Text>
        <StatusBadge status={teammate.status} />
        <Text fontSize={11} color="$gray8">{teammate.agentType}</Text>
      </XStack>

      {/* Content */}
      <ScrollView flex={1}>
        <YStack p="$4" gap="$4" maxWidth={640} alignSelf="center" width="100%">
          {/* Metadata */}
          <YStack bg="$gray2" borderColor="$gray4" borderWidth={1} rounded="$3" p="$3" gap="$0.5">
            <InfoRow label="Agent ID">
              <Text fontSize={11} color="$gray11" fontFamily="$mono">{teammate.agentId}</Text>
            </InfoRow>
            <InfoRow label="Type">{teammate.agentType}</InfoRow>
            <InfoRow label="Status"><StatusBadge status={teammate.status} /></InfoRow>
            {teammate.name && <InfoRow label="Name">{teammate.name}</InfoRow>}
            {teammate.transcriptPath && (
              <InfoRow label="Transcript">
                <Text fontSize={11} color="$gray9" fontFamily="$mono" numberOfLines={1}>
                  {teammate.transcriptPath}
                </Text>
              </InfoRow>
            )}
          </YStack>

          {/* Output */}
          <YStack gap="$2">
            <Text fontSize={11} fontWeight="600" color="$gray8" textTransform="uppercase" letterSpacing={0.5}>
              Output
            </Text>
            {teammate.output ? (
              <div
                style={{ backgroundColor: 'var(--color-gray1, #111)', borderRadius: 8, padding: 16 }}
                className="prose prose-sm prose-invert max-w-none prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 prose-code:text-blue-300 prose-headings:text-gray-100 prose-p:text-gray-200 prose-li:text-gray-200 prose-strong:text-white prose-a:text-blue-400"
              >
                <Markdown>{teammate.output}</Markdown>
              </div>
            ) : (
              <Text fontSize={13} color="$gray7" fontStyle="italic">No output yet</Text>
            )}
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
