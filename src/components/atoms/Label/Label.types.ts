import type { TextProps } from 'tamagui';

export interface LabelProps extends TextProps {
  htmlFor?: string;
  required?: boolean;
  children?: React.ReactNode;
}
