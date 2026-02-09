import { Text, XStack, YStack } from 'tamagui';
import type { Session } from '@ccgrid/shared';

export function CostTracker({ session }: { session: Session }) {
  const totalTokens = session.inputTokens + session.outputTokens;
  const hasBudget = session.maxBudgetUsd != null && session.maxBudgetUsd > 0;
  const budgetPercent = hasBudget
    ? Math.min(100, (session.costUsd / session.maxBudgetUsd!) * 100)
    : 0;

  const barColor =
    budgetPercent > 80 ? '$red5' : budgetPercent > 50 ? '$yellow5' : '$blue5';

  return (
    <XStack ai="center" gap="$3" ml="auto" shrink={0}>
      <XStack ai="center" gap="$1.5">
        <Text fontSize={12} color="$gray4">
          Cost:
        </Text>
        <Text fontSize={12} fontFamily="monospace" color="$gray2">
          ${session.costUsd.toFixed(4)}
        </Text>
        {hasBudget && (
          <Text fontSize={12} color="$gray6">
            / ${session.maxBudgetUsd!.toFixed(2)}
          </Text>
        )}
      </XStack>

      {hasBudget && (
        <YStack
          width={80}
          height={6}
          bg="$gray8"
          rounded="$10"
          overflow="hidden"
        >
          <YStack
            height="100%"
            rounded="$10"
            bg={barColor}
            width={`${budgetPercent}%` as any}
          />
        </YStack>
      )}

      <Text fontSize={12} fontFamily="monospace" color="$gray4">
        {totalTokens.toLocaleString()} tokens
      </Text>
    </XStack>
  );
}
