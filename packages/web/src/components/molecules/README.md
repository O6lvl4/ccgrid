# Molecules コンポーネント

複数のAtomsを組み合わせた複合UIコンポーネント群です。

## インポート方法

```typescript
import { Card, CardHeader, StatusBadge, FormField, SearchBox, IconButton, TagList } from '@/components/molecules';
```

## コンポーネント一覧

### Card
カードコンテナコンポーネント。

```typescript
<Card>
  <CardHeader title="タイトル" subtitle="サブタイトル" />
  {/* コンテンツ */}
</Card>
```

### CardHeader
カードのヘッダーコンポーネント。

```typescript
<CardHeader title="タイトル" subtitle="サブタイトル">
  {/* オプションの右側コンテンツ */}
</CardHeader>
```

### StatusBadge
ステータス表示用バッジコンポーネント。

```typescript
<StatusBadge status="active">Active</StatusBadge>
<StatusBadge status="inactive">Inactive</StatusBadge>
<StatusBadge status="pending">Pending</StatusBadge>
<StatusBadge status="error">Error</StatusBadge>
<StatusBadge status="success">Success</StatusBadge>
```

### FormField
ラベル、入力フィールド、エラーメッセージを含むフォームフィールドコンポーネント。

```typescript
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
```

### SearchBox
検索用入力フィールドコンポーネント。

```typescript
<SearchBox
  placeholder="検索..."
  onSearch={(value) => console.log(value)}
/>
```

### IconButton
アイコン付きボタンコンポーネント。

```typescript
<IconButton icon="➕" label="追加" variant="primary" />
<IconButton icon="🗑️" variant="ghost" />
```

### TagList
タグリスト表示コンポーネント。

```typescript
<TagList
  tags={[
    { id: '1', label: 'React', variant: 'info' },
    { id: '2', label: 'TypeScript', variant: 'success' },
  ]}
  onRemove={(id) => console.log('Remove tag:', id)}
/>
```

## ファイル構成

各コンポーネントは以下の3ファイル構成です：
- `ComponentName.tsx` - 実装
- `ComponentName.types.ts` - 型定義
- `index.ts` - エクスポート
