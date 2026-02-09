import type { ViewProps } from 'tamagui';

export interface CardHeaderProps extends ViewProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}
