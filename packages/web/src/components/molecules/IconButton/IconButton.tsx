import { XStack } from 'tamagui';
import { Button, Icon } from '@/components/atoms';
import type { IconButtonProps } from './IconButton.types';

export function IconButton({ icon, label, children, ...props }: IconButtonProps) {
  return (
    <Button {...props}>
      <XStack ai="center" gap="$1.5">
        <Icon name={icon} size={14} />
        {(label || children) && <span>{label || children}</span>}
      </XStack>
    </Button>
  );
}
