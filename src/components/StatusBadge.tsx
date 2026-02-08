import { Text, XStack, YStack } from 'tamagui';

const DOT: Record<string, { color: string; pulse?: boolean }> = {
  starting:    { color: '$yellow9' },
  running:     { color: '$green9', pulse: true },
  completed:   { color: '$gray8' },
  error:       { color: '$red9' },
  working:     { color: '$blue9', pulse: true },
  idle:        { color: '$gray8' },
  stopped:     { color: '$gray7' },
  pending:     { color: '$gray7' },
  in_progress: { color: '$blue9', pulse: true },
};

export function StatusBadge({ status, showLabel = true }: { status: string; showLabel?: boolean }) {
  const d = DOT[status] ?? DOT.pending;

  return (
    <XStack items="center" gap="$1.5" shrink={0}>
      <YStack
        width={7}
        height={7}
        rounded={100}
        bg={d.color as any}
        className={d.pulse ? 'animate-pulse' : undefined}
      />
      {showLabel && (
        <Text fontSize={11} color="$gray9" letterSpacing={0.2}>
          {status}
        </Text>
      )}
    </XStack>
  );
}
