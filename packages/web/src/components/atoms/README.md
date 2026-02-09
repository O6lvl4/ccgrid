# Atoms コンポーネント

基本的なUI要素を提供するAtomicコンポーネント群です。

## インポート方法

```typescript
import { Button, Input, Badge, Avatar, Label, Divider, Icon, Spinner } from '@/components/atoms';
```

## コンポーネント一覧

### Button
基本的なボタンコンポーネント。3つのバリアント（primary, secondary, ghost）をサポート。

```typescript
<Button variant="primary">Primary Button</Button>
<Button variant="secondary">Secondary Button</Button>
<Button variant="ghost">Ghost Button</Button>
```

### Input
入力フィールドコンポーネント。エラー状態のスタイリングをサポート。

```typescript
<Input placeholder="通常の入力" />
<Input error placeholder="エラー状態" />
```

### Badge
ステータスや情報を表示するバッジコンポーネント。

```typescript
<Badge variant="default">Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="error">Error</Badge>
<Badge variant="info">Info</Badge>
```

### Avatar
ユーザーアバターを表示するコンポーネント。

```typescript
<Avatar size="sm" src="/path/to/image.jpg" alt="User" />
<Avatar size="md" fallback="JD" />
<Avatar size="lg" fallback="?" />
```

### Label
フォームラベルコンポーネント。必須フィールドのマーキングをサポート。

```typescript
<Label>ユーザー名</Label>
<Label required>必須フィールド</Label>
```

### Divider
区切り線コンポーネント。水平・垂直方向をサポート。

```typescript
<Divider orientation="horizontal" />
<Divider orientation="vertical" />
```

### Icon
アイコン表示コンポーネント。

```typescript
<Icon name="🔍" size={16} />
```

### Spinner
ローディングスピナーコンポーネント。

```typescript
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />
```

## ファイル構成

各コンポーネントは以下の3ファイル構成です：
- `ComponentName.tsx` - 実装
- `ComponentName.types.ts` - 型定義
- `index.ts` - エクスポート
