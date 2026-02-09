import type { InputProps } from '@/components/atoms';

export interface SearchBoxProps extends Omit<InputProps, 'error'> {
  onSearch?: (value: string) => void;
}
