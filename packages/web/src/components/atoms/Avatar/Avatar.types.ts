import type { ViewProps } from 'tamagui';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps extends ViewProps {
  size?: AvatarSize;
  src?: string;
  alt?: string;
  fallback?: string;
}
