import type { InputProps as TamaguiInputProps } from 'tamagui';

export interface InputProps extends Partial<TamaguiInputProps> {
  error?: boolean;
}
