import { Paragraph, ScrollView, Text, XStack, YStack } from 'tamagui';
import type { Session } from '../../../shared/types';

function SectionLabel({ children }: { children: string }) {
  return (
    <Text fontSize={11} fontWeight="600" color="$gray8" textTransform="uppercase" letterSpacing={0.5} mb="$2">
      {children}
    </Text>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <XStack items="baseline" gap="$3" py="$1">
      <Text fontSize={12} color="$gray8" shrink={0} width={100}>{label}</Text>
      <Text fontSize={13} color="$gray12" minWidth={0} flex={1}>{children}</Text>
    </XStack>
  );
}

export function OverviewTab({ session }: { session: Session }) {
  const hasBudget = session.maxBudgetUsd != null && session.maxBudgetUsd > 0;
  const budgetPercent = hasBudget
    ? Math.min(100, (session.costUsd / session.maxBudgetUsd!) * 100)
    : 0;
  const totalTokens = session.inputTokens + session.outputTokens;
  const budgetColor = budgetPercent > 80 ? '$red9' : budgetPercent > 50 ? '$yellow9' : '$blue9';

  return (
    <ScrollView flex={1}>
      <YStack p="$4" gap="$5" maxWidth={640} alignSelf="center" width="100%">
        {/* Task Description */}
        <YStack>
          <SectionLabel>Task Description</SectionLabel>
          <YStack bg="$gray2" borderWidth={1} borderColor="$gray4" rounded="$3" p="$3">
            <Paragraph fontSize={13} color="$gray11" whiteSpace="pre-wrap" lineHeight={20}>
              {session.taskDescription}
            </Paragraph>
          </YStack>
        </YStack>

        {/* Configuration */}
        <YStack>
          <SectionLabel>Configuration</SectionLabel>
          <YStack bg="$gray2" borderWidth={1} borderColor="$gray4" rounded="$3" p="$3" gap="$0.5">
            <InfoRow label="Model">{session.model}</InfoRow>
            <InfoRow label="Working Dir">
              <Text fontFamily="monospace" fontSize={12} color="$gray11">{session.cwd}</Text>
            </InfoRow>
            {hasBudget && (
              <InfoRow label="Budget">${session.maxBudgetUsd!.toFixed(2)}</InfoRow>
            )}
            <InfoRow label="Created">{new Date(session.createdAt).toLocaleString()}</InfoRow>
            {session.sessionId && (
              <InfoRow label="Session ID">
                <Text fontFamily="monospace" fontSize={11} color="$gray9">{session.sessionId}</Text>
              </InfoRow>
            )}
          </YStack>
        </YStack>

        {/* Teammate Specs */}
        {session.teammateSpecs && session.teammateSpecs.length > 0 && (
          <YStack>
            <SectionLabel>Teammate Specs</SectionLabel>
            <YStack gap="$2">
              {session.teammateSpecs.map((spec, i) => (
                <YStack key={i} bg="$gray2" borderWidth={1} borderColor="$gray4" rounded="$3" p="$3">
                  <XStack items="baseline" gap="$2">
                    <Text fontWeight="600" fontSize={13} color="$gray12">{spec.name}</Text>
                    <Text color="$gray9" fontSize={12}>{spec.role}</Text>
                  </XStack>
                  {spec.instructions && (
                    <Text color="$gray9" mt="$1.5" fontSize={12} whiteSpace="pre-wrap" lineHeight={18}>
                      {spec.instructions}
                    </Text>
                  )}
                </YStack>
              ))}
            </YStack>
          </YStack>
        )}

        {/* Cost & Tokens */}
        <YStack>
          <SectionLabel>Cost & Tokens</SectionLabel>
          <YStack bg="$gray2" borderWidth={1} borderColor="$gray4" rounded="$3" p="$3" gap="$2">
            <XStack ai="center" gap="$3">
              <Text fontSize={12} color="$gray8" width={100}>Cost</Text>
              <Text fontFamily="monospace" color="$gray12" fontSize={13} fontWeight="600">
                ${session.costUsd.toFixed(4)}
              </Text>
              {hasBudget && (
                <Text color="$gray8" fontSize={12}>/ ${session.maxBudgetUsd!.toFixed(2)}</Text>
              )}
            </XStack>

            {hasBudget && (
              <XStack ai="center" gap="$3">
                <Text fontSize={12} color="$gray8" width={100}>Budget</Text>
                <XStack flex={1} height={6} bg="$gray4" rounded="$10" overflow="hidden" maxWidth={200}>
                  <YStack height="100%" rounded="$10" bg={budgetColor as any} width={`${budgetPercent}%` as any} />
                </XStack>
                <Text fontSize={11} color="$gray9" fontFamily="monospace">{budgetPercent.toFixed(0)}%</Text>
              </XStack>
            )}

            <XStack ai="center" gap="$3">
              <Text fontSize={12} color="$gray8" width={100}>Tokens</Text>
              <Text fontFamily="monospace" color="$gray12" fontSize={13}>
                {totalTokens.toLocaleString()}
              </Text>
              <Text color="$gray8" fontSize={11}>
                ({session.inputTokens.toLocaleString()} in / {session.outputTokens.toLocaleString()} out)
              </Text>
            </XStack>
          </YStack>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
