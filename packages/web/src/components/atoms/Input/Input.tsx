import { Input as TamaguiInput } from 'tamagui';
import type { InputProps } from './Input.types';

export function Input({ error = false, ...props }: InputProps) {
  return (
    <TamaguiInput
      px="$2.5"
      py="$2"
      rounded="$2"
      fontSize={13}
      bg="$gray3"
      color="$gray12"
      borderWidth={1}
      borderColor={error ? '$red8' : '$gray6'}
      focusStyle={{
        borderColor: error ? '$red9' : '$blue9',
        outlineWidth: 0,
      }}
      hoverStyle={{
        borderColor: error ? '$red8' : '$gray7',
      }}
      placeholderTextColor="$gray9"
      {...props}
    />
  );
}
