import { View, Text } from 'tamagui';
import type { AvatarProps } from './Avatar.types';

export function Avatar({ size = 'md', src, alt, fallback, ...props }: AvatarProps) {
  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 48,
  };

  const fontSize = {
    sm: 10,
    md: 12,
    lg: 16,
  };

  const dimension = sizeMap[size];

  return (
    <View
      width={dimension}
      height={dimension}
      rounded="$10"
      bg="$gray6"
      ai="center"
      jc="center"
      overflow="hidden"
      {...props}
    >
      {src ? (
        <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Text fontSize={fontSize[size]} fontWeight="600" color="$gray11">
          {fallback || '?'}
        </Text>
      )}
    </View>
  );
}
