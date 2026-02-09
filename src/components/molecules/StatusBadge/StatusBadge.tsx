import { Badge } from '@/components/atoms';
import type { StatusBadgeProps } from './StatusBadge.types';

export function StatusBadge({ status, children, ...props }: StatusBadgeProps) {
  const variantMap = {
    active: 'success' as const,
    inactive: 'default' as const,
    pending: 'warning' as const,
    error: 'error' as const,
    success: 'success' as const,
  };

  return (
    <Badge variant={variantMap[status]} {...props}>
      {children || status}
    </Badge>
  );
}
