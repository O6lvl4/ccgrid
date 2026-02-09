import type { ButtonProps as TamaguiButtonProps } from 'tamagui';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends Omit<TamaguiButtonProps, 'variant'> {
  variant?: ButtonVariant;
  children?: React.ReactNode;
}
