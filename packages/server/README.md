# @ccgrid/server

Hono + WebSocket によるバックエンドサーバー。Claude Agent SDK を使ってエージェントの起動・監視・権限管理を行う。

## 起動

```bash
npm run dev  # tsx watch src/index.ts (ポート 7819)
```

## 構成

| ファイル | 役割 |
|---|---|
| `index.ts` | Hono ルーティング + WebSocket サーバー |
| `session-manager.ts` | セッション CRUD、エージェント起動、権限リクエスト管理 |
| `prompt-builder.ts` | Lead エージェントへのシステムプロンプト・タスクプロンプト構築 |
| `lead-stream.ts` | Lead エージェントのストリーム処理（出力・コスト・ステータス） |
| `hook-handlers.ts` | SDK フック（SubagentStart/Stop, TeammateIdle, TaskCompleted） |
| `task-watcher.ts` | タスク状態のポーリングと同期 |
| `transcript-poller.ts` | Teammate トランスクリプトのポーリング |
| `transcript-reader.ts` | Teammate の出力読み取り |
| `state-store.ts` | セッション状態の永続化（JSON ファイル） |

## 主な依存

- **Hono** + **@hono/node-server** — HTTP サーバー
- **ws** — WebSocket
- **@anthropic-ai/claude-agent-sdk** — Claude エージェント制御
