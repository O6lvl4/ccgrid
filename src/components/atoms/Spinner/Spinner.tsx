import { Spinner as TamaguiSpinner } from 'tamagui';
import type { SpinnerProps } from './Spinner.types';

export function Spinner({ size = 'md', ...props }: SpinnerProps) {
  const sizeMap = {
    sm: 'small',
    md: 'small',
    lg: 'large',
  } as const;

  return <TamaguiSpinner size={sizeMap[size]} color="$blue9" {...props} />;
}
