import { XStack } from 'tamagui';
import { Input, Icon } from '@/components/atoms';
import type { SearchBoxProps } from './SearchBox.types';

export function SearchBox({ onSearch, ...props }: SearchBoxProps) {
  return (
    <XStack ai="center" gap="$2" position="relative">
      <XStack position="absolute" left="$2.5" zi={1} ai="center">
        <Icon name="🔍" size={14} />
      </XStack>
      <Input pl="$6" {...props} />
    </XStack>
  );
}
