# @ccgrid/web

React + Zustand + Tailwind CSS によるフロントエンド。セッション管理、Teammate 監視、タスク追跡、権限承認の GUI を提供する。

## 起動

```bash
npm run dev  # vite (ポート 7820)
```

## 構成

```
src/
  App.tsx              # ルートコンポーネント（ViewShell）
  main.tsx             # エントリーポイント
  store/useStore.ts    # Zustand ストア（状態管理 + WebSocket メッセージ処理）
  hooks/
    useApi.ts          # REST API クライアント
    useWebSocket.ts    # WebSocket 接続管理
  components/
    layout/            # ViewShell, SessionSidebar, Breadcrumb
    views/             # SessionListView, SessionDetailView, OutputTab 等
    atoms/             # Button, Badge, Input 等の基本コンポーネント
    molecules/         # Card, FormField, IconButton 等の複合コンポーネント
    PermissionDialog   # 権限リクエストの承認/拒否/入力編集 UI
  utils/
    timeAgo.ts         # 相対時間表示
    twemoji.tsx        # Twemoji レンダリング
```

## 主な依存

- **React 19** + **Vite**
- **Zustand** — 状態管理
- **Tailwind CSS** — スタイリング
- **react-markdown** + **remark-gfm** — Markdown レンダリング
