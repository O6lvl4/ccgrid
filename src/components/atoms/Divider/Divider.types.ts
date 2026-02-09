import type { ViewProps } from 'tamagui';

export type DividerOrientation = 'horizontal' | 'vertical';

export interface DividerProps extends ViewProps {
  orientation?: DividerOrientation;
}
