# @ccgrid/shared

server / web 間で共有する TypeScript 型定義パッケージ。

## 主な型

| 型 | 説明 |
|---|---|
| `Session` | セッション（Lead エージェント + Teammate 群）の状態 |
| `Teammate` | 個々の Teammate エージェントの状態 |
| `TeamTask` | タスク情報 |
| `TeammateSpec` | セッション作成時に指定する Teammate テンプレート |
| `ServerMessage` | サーバー → クライアントの WebSocket メッセージ |
| `ClientMessage` | クライアント → サーバーの WebSocket メッセージ |
