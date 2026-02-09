import { View, Text } from 'tamagui';
import type { BadgeProps } from './Badge.types';

export function Badge({ variant = 'default', children, ...props }: BadgeProps) {
  const variantStyles = {
    default: {
      bg: '$gray4',
      color: '$gray11',
    },
    success: {
      bg: '$green4',
      color: '$green11',
    },
    warning: {
      bg: '$yellow4',
      color: '$yellow11',
    },
    error: {
      bg: '$red4',
      color: '$red11',
    },
    info: {
      bg: '$blue4',
      color: '$blue11',
    },
  };

  const styles = variantStyles[variant];

  return (
    <View
      px="$2"
      py="$1"
      rounded="$2"
      bg={styles.bg}
      {...props}
    >
      <Text fontSize={11} fontWeight="500" color={styles.color}>
        {children}
      </Text>
    </View>
  );
}
