import { YStack } from 'tamagui';
import { Button, Input, Badge, Label, Divider } from '@/components/atoms';
import { Card, CardHeader, FormField, StatusBadge } from '@/components/molecules';

/**
 * Atomic Design のデモコンポーネント
 * 新しく作成された atoms と molecules の使用例
 */
export function AtomicDesignDemo() {
  return (
    <YStack gap="$4" p="$4">
      <Card>
        <CardHeader title="Atoms コンポーネント" subtitle="基本的なUI要素" />
        <YStack gap="$3">
          <YStack gap="$2">
            <Label>ボタンのバリエーション</Label>
            <YStack gap="$2">
              <Button variant="primary">Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="ghost">Ghost Button</Button>
            </YStack>
          </YStack>

          <Divider />

          <YStack gap="$2">
            <Label>入力フィールド</Label>
            <Input placeholder="通常の入力" />
            <Input error placeholder="エラー状態の入力" />
          </YStack>

          <Divider />

          <YStack gap="$2">
            <Label>バッジ</Label>
            <YStack gap="$1.5">
              <Badge variant="default">Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </YStack>
          </YStack>
        </YStack>
      </Card>

      <Card>
        <CardHeader title="Molecules コンポーネント" subtitle="複合的なUI要素" />
        <YStack gap="$3">
          <FormField
            label="ユーザー名"
            required
            inputProps={{ placeholder: 'ユーザー名を入力' }}
          />
          <FormField
            label="メールアドレス"
            error="有効なメールアドレスを入力してください"
            inputProps={{ placeholder: 'email@example.com' }}
          />

          <Divider />

          <YStack gap="$2">
            <Label>ステータスバッジ</Label>
            <YStack gap="$1.5">
              <StatusBadge status="active">Active</StatusBadge>
              <StatusBadge status="inactive">Inactive</StatusBadge>
              <StatusBadge status="pending">Pending</StatusBadge>
              <StatusBadge status="error">Error</StatusBadge>
              <StatusBadge status="success">Success</StatusBadge>
            </YStack>
          </YStack>
        </YStack>
      </Card>
    </YStack>
  );
}
