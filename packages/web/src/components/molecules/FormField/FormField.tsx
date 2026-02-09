import { YStack, Text } from 'tamagui';
import { Label, Input } from '@/components/atoms';
import type { FormFieldProps } from './FormField.types';

export function FormField({ label, required, error, inputProps, children, ...props }: FormFieldProps) {
  return (
    <YStack gap="$1" {...props}>
      <Label required={required}>{label}</Label>
      {children || <Input error={!!error} {...inputProps} />}
      {error && (
        <Text fontSize={11} color="$red9">
          {error}
        </Text>
      )}
    </YStack>
  );
}
