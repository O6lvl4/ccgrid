import type { ViewProps } from 'tamagui';

export interface Tag {
  id: string;
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export interface TagListProps extends ViewProps {
  tags: Tag[];
  onRemove?: (id: string) => void;
}
