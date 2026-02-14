# コントリビューションガイド

ccgrid への貢献に興味を持っていただきありがとうございます。

## 開発環境のセットアップ

### 必要な環境

- Node.js 20.x 以上
- npm(Node.js に付属)
- Git

### セットアップ手順

1. リポジトリをフォーク

2. クローン
```bash
git clone https://github.com/YOUR_USERNAME/ccgrid.git
cd ccgrid
```

3. 依存関係のインストール
```bash
npm install
```

4. 開発サーバーの起動
```bash
npm run dev
```

ブラウザで http://localhost:7820 を開いて動作確認できます。

### プロジェクト構成

```
packages/
  shared/   # 共有型定義 (Session, Teammate, TeamTask, ServerMessage 等)
  server/   # Hono + WebSocket サーバー (ポート 7819)
  web/      # Vite + React + Tailwind CSS フロントエンド (ポート 7820)
```

## プルリクエストの流れ

1. **Issue の作成(推奨)**
   - 大きな変更の場合は、先に Issue で議論することをお勧めします

2. **ブランチの作成**
```bash
git checkout -b feature/your-feature-name
```

3. **コードの変更**
   - 変更内容をコミット
   - コミットメッセージは日本語で簡潔に(prefixなし)
   - 例: `セッション詳細画面のパフォーマンス最適化`

4. **プッシュ**
```bash
git push origin feature/your-feature-name
```

5. **プルリクエストの作成**
   - GitHub でプルリクエストを作成
   - テンプレートに従って変更内容を記載

## コーディング規約

### TypeScript

- `strict: true` で型安全性を確保
- 明示的な型注釈を推奨(特に関数の引数と戻り値)
- `any` の使用は避ける

### React コンポーネント

- 関数コンポーネントを使用
- パフォーマンスが重要な場合は `memo` を活用
- カスタムフックは `use` プレフィックスを使用
- コンポーネントファイルは PascalCase(例: `SessionDetailView.tsx`)

### スタイリング

- Tailwind CSS を使用
- インラインスタイルは必要最小限に
- レスポンシブデザインを考慮

### ファイル・フォルダ構成

- **packages/shared**: 型定義のみ、実装を含まない
- **packages/server**: バックエンドロジック、WebSocket、REST API
- **packages/web**: フロントエンドコンポーネント、hooks、store

```
packages/web/src/
  components/
    dialogs/      # ダイアログコンポーネント
    layout/       # レイアウト関連
    output/       # 出力表示関連
    session/      # セッション関連UI
    views/        # メインビュー
  hooks/          # カスタムフック
  store/          # Zustand ストア
  utils/          # ユーティリティ関数
```

### 命名規則

- 変数・関数: camelCase
- コンポーネント・型・インターフェース: PascalCase
- 定数: UPPER_SNAKE_CASE(グローバル定数の場合)
- ファイル名:
  - コンポーネント: PascalCase (例: `SessionPanel.tsx`)
  - ユーティリティ: camelCase (例: `timeAgo.ts`)

## テスト

現在テストフレームワークは導入されていませんが、以下の手動確認を推奨します。

- [ ] 開発サーバーが正常に起動する
- [ ] 既存機能が正常に動作する
- [ ] ブラウザのコンソールにエラーが出ていない
- [ ] TypeScript のコンパイルエラーがない

## SSH ControlMaster の設定(推奨)

並列 git 操作を行う場合、SSH の ControlMaster を有効にすることを推奨します。

`~/.ssh/config` に追加:

```ssh-config
Host *
  ControlMaster auto
  ControlPath ~/.ssh/sockets/%r@%h-%p
  ControlPersist 600
```

```bash
mkdir -p ~/.ssh/sockets
```

## 質問・サポート

- Issue で質問を投稿してください
- バグ報告は Issue テンプレートに従ってください

## ライセンス

このプロジェクトは MIT ライセンスの元で公開されています。コントリビューションも同様のライセンスで公開されます。
