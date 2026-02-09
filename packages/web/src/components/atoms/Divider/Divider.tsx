import { View } from 'tamagui';
import type { DividerProps } from './Divider.types';

export function Divider({ orientation = 'horizontal', ...props }: DividerProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <View
      width={isHorizontal ? '100%' : 1}
      height={isHorizontal ? 1 : '100%'}
      bg="$gray5"
      {...props}
    />
  );
}
