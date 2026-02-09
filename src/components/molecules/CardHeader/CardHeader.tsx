import { XStack, YStack, Text } from 'tamagui';
import type { CardHeaderProps } from './CardHeader.types';

export function CardHeader({ title, subtitle, children, ...props }: CardHeaderProps) {
  return (
    <XStack ai="center" jc="space-between" mb="$2" {...props}>
      <YStack gap="$0.5">
        <Text fontSize={14} fontWeight="600" color="$gray12">
          {title}
        </Text>
        {subtitle && (
          <Text fontSize={12} color="$gray10">
            {subtitle}
          </Text>
        )}
      </YStack>
      {children}
    </XStack>
  );
}
