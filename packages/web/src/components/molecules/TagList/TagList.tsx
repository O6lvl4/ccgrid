import { XStack, Text } from 'tamagui';
import { Badge } from '@/components/atoms';
import type { TagListProps } from './TagList.types';

export function TagList({ tags, onRemove, ...props }: TagListProps) {
  return (
    <XStack gap="$1.5" flexWrap="wrap" {...props}>
      {tags.map((tag) => (
        <XStack key={tag.id} ai="center" gap="$1">
          <Badge variant={tag.variant}>
            {tag.label}
          </Badge>
          {onRemove && (
            <Text
              fontSize={11}
              color="$gray9"
              cursor="pointer"
              hoverStyle={{ color: '$red9' }}
              onPress={() => onRemove(tag.id)}
            >
              ✕
            </Text>
          )}
        </XStack>
      ))}
    </XStack>
  );
}
