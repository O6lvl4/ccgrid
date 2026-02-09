import { View } from 'tamagui';
import type { CardProps } from './Card.types';

export function Card({ children, ...props }: CardProps) {
  return (
    <View
      bg="$gray2"
      rounded="$3"
      p="$3"
      borderWidth={1}
      borderColor="$gray5"
      {...props}
    >
      {children}
    </View>
  );
}
