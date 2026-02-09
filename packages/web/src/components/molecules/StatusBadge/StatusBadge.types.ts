import type { BadgeProps } from '@/components/atoms';

export type Status = 'active' | 'inactive' | 'pending' | 'error' | 'success';

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: Status;
  children?: React.ReactNode;
}
