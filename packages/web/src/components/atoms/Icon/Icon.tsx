import { Text } from 'tamagui';
import type { IconProps } from './Icon.types';

export function Icon({ name, size = 16, ...props }: IconProps) {
  return (
    <Text fontSize={size} color="$gray11" {...props}>
      {name}
    </Text>
  );
}
