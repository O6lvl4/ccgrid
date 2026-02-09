# ccgrid

Claude Agent SDK を使ったチーム開発管理ツール。Lead エージェントが複数の Teammate エージェントを起動・監視し、タスクを並列で進行する。

## 構成

```
packages/
  shared/   # 共有型定義 (Session, Teammate, TeamTask, ServerMessage etc.)
  server/   # Hono + WebSocket サーバー (ポート 7819)
  web/      # Vite + React + Tamagui フロントエンド (ポート 7820)
```

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで http://localhost:7820 を開く。

## SSH ControlMaster の設定（推奨）

セッション内で複数リポジトリの git 操作を並列実行する場合、SSH 接続が不安定になることがある（`Connection reset by peer`）。
SSH の ControlMaster を有効にすると、1つの接続を使い回すため安定性が大幅に向上する。

`~/.ssh/config` に以下を追加:

```ssh-config
Host *
  ControlMaster auto
  ControlPath ~/.ssh/sockets/%r@%h-%p
  ControlPersist 600
```

ソケット用ディレクトリも作成:

```bash
mkdir -p ~/.ssh/sockets
```

- **ControlMaster auto** — 最初の接続をマスターとして再利用。以降は新規 SSH ハンドシェイクなしでソケット経由通信
- **ControlPersist 600** — 最後のセッション終了後も 10 分間マスター接続を維持

> 既に `Host *` ブロックがある場合は、そのブロック内に上記3行を追記する。
