import { Text } from 'tamagui';
import type { LabelProps } from './Label.types';

export function Label({ required = false, children, ...props }: LabelProps) {
  return (
    <Text
      fontSize={12}
      fontWeight="500"
      color="$gray11"
      mb="$1"
      {...props}
    >
      {children}
      {required && (
        <Text color="$red9"> *</Text>
      )}
    </Text>
  );
}
