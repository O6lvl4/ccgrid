import { Button as TamaguiButton } from 'tamagui';
import type { ButtonProps } from './Button.types';

export function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  const variantStyles = {
    primary: {
      bg: '$blue9',
      color: '$gray1',
      hoverStyle: { bg: '$blue10' },
      pressStyle: { bg: '$blue8' },
    },
    secondary: {
      bg: '$gray6',
      color: '$gray12',
      hoverStyle: { bg: '$gray7' },
      pressStyle: { bg: '$gray5' },
    },
    ghost: {
      bg: 'transparent',
      color: '$gray11',
      hoverStyle: { bg: '$gray4' },
      pressStyle: { bg: '$gray5' },
    },
  };

  const styles = variantStyles[variant];

  return (
    <TamaguiButton
      px="$3"
      py="$2"
      rounded="$2"
      cursor="pointer"
      {...styles}
      {...props}
    >
      {children}
    </TamaguiButton>
  );
}
