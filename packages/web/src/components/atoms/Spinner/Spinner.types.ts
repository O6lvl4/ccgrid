import type { ViewProps } from 'tamagui';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps extends ViewProps {
  size?: SpinnerSize;
}
