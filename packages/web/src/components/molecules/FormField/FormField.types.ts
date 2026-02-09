import type { ViewProps } from 'tamagui';
import type { InputProps } from '@/components/atoms';

export interface FormFieldProps extends ViewProps {
  label: string;
  required?: boolean;
  error?: string;
  inputProps?: InputProps;
  children?: React.ReactNode;
}
