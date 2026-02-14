# ccgrid

Claude Agent SDK を使ったチーム開発管理ツール。Lead エージェントが複数の Teammate エージェントを起動・監視し、タスクを並列で進行する。

## 概要

ccgrid は、Claude Agent SDK を活用した協調型 AI チーム開発環境です。1つの Lead エージェントが複数の Teammate エージェントを管理し、並列でタスクを実行することで、大規模なプロジェクトを効率的に進めることができます。

## 主要機能

### 1. セッション管理
- **Lead + Teammate チーム構成**: Lead エージェントが Teammate を動的に起動・監視
- **セッション再開**: 中断したセッションを続行可能（`POST /api/sessions/:id/continue`）
- **コスト追跡**: トークン使用量とコストをリアルタイム表示
- **使用率ゲージ**: プラン上限に対する使用率を燃料計スタイルで可視化

### 2. Teammate コーディネーション
- **自動検出**: Agent SDK の Hooks により Teammate を自動発見
- **タスク同期**: `~/.claude/tasks/{sessionId}/` のタスク JSON を監視・同期
- **DM リレー**: Lead ↔ Teammate 間のメッセージ送受信（WebSocket + REST API）
- **ステータス管理**: `starting` → `working` → `idle` → `stopped` のライフサイクル

### 3. スキル・プラグインシステム
- **3種類のスキル**:
  - `official`: Claude 公式スキル
  - `external`: GitHub リポジトリからインストール
  - `internal`: ユーザー定義スキル
- **プラグイン管理**: GitHub リポジトリ（例: `owner/repo`）から `ccgrid-plugin.json` を読み込み、スキルを一括インストール
- **スキル発見**: Lead プロンプトに自動挿入され、Teammate から利用可能

### 4. パーミッション管理
- **ルールベース自動判定**: ツール名とパスパターンによる `allow` / `deny` ルール
- **インタラクティブ許可**: ルールに該当しない場合、UI で許可/拒否を選択
- **Permission Log**: 全ての許可判定を履歴として記録（`PermissionLogEntry`）
- **入力書き換え**: 許可時にツール入力パラメータを修正可能

### 5. リアルタイム通信（WebSocket）
- **Server → Client**: セッション状態、Teammate 出力、タスク更新、コスト変動を即座に配信
- **Client → Server**: パーミッション応答、Teammate へのメッセージ送信
- **スナップショット配信**: 接続時に全状態を一括送信（`type: 'snapshot'`）

### 6. ファイル共有
- **Base64 エンコード**: 添付ファイルを JSON として送信
- **画像圧縮**: 大きな画像を自動リサイズ（最大 2048px）
- **サムネイル表示**: UI でプレビュー可能
- **Lead + Teammate に配布**: セッション作成時・続行時に自動添付

### 7. パフォーマンス最適化
- **段階的レンダリング**: 大量の Teammate 出力を `requestAnimationFrame` でバッチ化
- **Tab キャッシング**: Overview / Output / Teammates / Tasks タブの描画結果をキャッシュ
- **Skeleton UI**: データロード中にスケルトン表示
- **ファイル分割**: 大きなコンポーネント（IconRail, TasksTab 等）を分割して初回ロード時間を短縮

## 技術スタック

| レイヤー | 技術 | バージョン |
|---|---|---|
| **Backend** | Hono | 4.7 |
| | WebSocket (ws) | 8.18 |
| | Claude Agent SDK | 0.2.37 |
| **Frontend** | React | 19.1 |
| | Zustand | 5.0 |
| | Vite | 6.3 |
| | Tailwind CSS | 4.1 |
| **モノレポ** | npm workspaces | - |

## セットアップ

### 前提条件
- Node.js 18+ / npm 9+
- Anthropic API キー（環境変数 `ANTHROPIC_API_KEY`）

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/ccgrid.git
cd ccgrid

# 依存パッケージをインストール
npm install

# 開発サーバーを起動（server + web を並列起動）
npm run dev
```

- Server: http://localhost:7819
- Web UI: http://localhost:7820

ブラウザで http://localhost:7820 を開くと UI が表示されます。

## アーキテクチャ

### セッション生成フロー

```
1. ユーザーが NewSessionDialog でセッション設定を入力
   ↓
2. POST /api/sessions → SessionManager.createSession()
   ↓
3. AgentBuilder が Lead エージェント用プロンプトを生成
   - カスタム指示
   - スキル一覧
   - Teammate Specs
   - ファイル添付
   ↓
4. Agent SDK で Lead エージェントを起動（agent.start()）
   ↓
5. Hooks により Teammate 発見・タスク同期・コスト更新を検出
   ↓
6. WebSocket で UI に状態を配信
```

### Teammate Discovery Hooks

Agent SDK の `onAgentAction` フックを利用し、以下を検出:

- **TeamCreate**: チーム名・タスクリストディレクトリ作成を検出
- **Task ツール呼び出し**: Teammate 起動を検出 → `teammate_discovered` イベント
- **TaskUpdate**: タスク完了を検出 → `task_completed` イベント
- **SendMessage**: DM を検出 → `teammate_message_relayed` イベント

### Permission Evaluator フロー

```
1. Agent がツールを実行しようとする
   ↓
2. onPermissionRequest フック発火
   ↓
3. PermissionEvaluator がルールに基づき自動判定
   - toolName + pathPattern でマッチング
   - ルールが見つかれば即座に allow / deny
   ↓
4. ルールがない場合、WebSocket で UI に permission_request 送信
   ↓
5. ユーザーが UI で Allow / Deny / Modify Input を選択
   ↓
6. Client が permission_response を送信
   ↓
7. SessionManager が Promise を resolve
   ↓
8. Agent SDK にレスポンスを返却
```

## API エンドポイント

### REST API

| メソッド | パス | 説明 |
|---|---|---|
| `POST` | `/api/sessions` | セッション作成 |
| `GET` | `/api/sessions` | セッション一覧取得 |
| `GET` | `/api/sessions/:id` | セッション詳細取得 |
| `PATCH` | `/api/sessions/:id` | セッション更新 |
| `DELETE` | `/api/sessions/:id` | セッション削除 |
| `POST` | `/api/sessions/:id/stop` | セッション停止 |
| `POST` | `/api/sessions/:id/continue` | セッション続行 |
| `POST` | `/api/sessions/:id/teammates/:name/message` | Teammate にメッセージ送信 |
| `GET` | `/api/sessions/:id/teammates` | Teammate 一覧取得 |
| `GET` | `/api/sessions/:id/tasks` | タスク一覧取得 |
| `GET` | `/api/sessions/:id/permissions` | Permission Log 取得 |
| `GET` | `/api/teammate-specs` | Teammate Spec 一覧 |
| `POST` | `/api/teammate-specs` | Teammate Spec 作成 |
| `PATCH` | `/api/teammate-specs/:id` | Teammate Spec 更新 |
| `DELETE` | `/api/teammate-specs/:id` | Teammate Spec 削除 |
| `GET` | `/api/skill-specs` | Skill Spec 一覧 |
| `POST` | `/api/skill-specs` | Skill Spec 作成 |
| `DELETE` | `/api/skill-specs/:id` | Skill Spec 削除 |
| `GET` | `/api/plugins` | Plugin 一覧 |
| `POST` | `/api/plugins/install` | GitHub からプラグインインストール |
| `DELETE` | `/api/plugins/:name` | プラグイン削除 |
| `GET` | `/api/permission-rules` | Permission Rule 一覧 |
| `POST` | `/api/permission-rules` | Permission Rule 作成 |
| `DELETE` | `/api/permission-rules/:id` | Permission Rule 削除 |
| `GET` | `/api/usage` | API 使用量取得（ccusage） |
| `GET` | `/api/health` | ヘルスチェック |
| `GET` | `/api/dirs` | ディレクトリ一覧取得 |
| `GET` | `/api/dirs/validate` | ディレクトリ検証 |

### WebSocket メッセージタイプ（Server → Client）

- `snapshot`: 全状態スナップショット（接続時）
- `session_created`: セッション作成
- `session_status`: セッションステータス変更
- `session_deleted`: セッション削除
- `lead_output`: Lead エージェント出力
- `teammate_discovered`: Teammate 発見
- `teammate_status`: Teammate ステータス変更
- `teammate_output`: Teammate 出力
- `task_sync`: タスク同期
- `task_completed`: タスク完了
- `cost_update`: コスト更新
- `permission_request`: パーミッション要求
- `permission_resolved`: パーミッション判定完了
- `permission_rules_updated`: ルール更新
- `teammate_message_relayed`: Teammate メッセージリレー
- `error`: エラー

### WebSocket メッセージタイプ（Client → Server）

- `permission_response`: パーミッション応答
- `teammate_message`: Teammate にメッセージ送信

## ディレクトリ構造

```
ccgrid/
├── packages/
│   ├── shared/          # 共有型定義
│   │   └── src/
│   │       ├── types.ts
│   │       └── index.ts
│   ├── server/          # Hono API + WebSocket
│   │   └── src/
│   │       ├── index.ts
│   │       ├── session-manager.ts
│   │       ├── agent-builder.ts
│   │       ├── permission-evaluator.ts
│   │       ├── hook-handlers.ts
│   │       ├── task-watcher.ts
│   │       ├── transcript-poller.ts
│   │       ├── usage-tracker.ts
│   │       ├── state-store.ts
│   │       └── routes/
│   │           ├── sessions.ts
│   │           ├── specs.ts
│   │           └── plugins.ts
│   └── web/             # React UI
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── store.ts
│           ├── api.ts
│           ├── components/
│           │   ├── layout/
│           │   │   ├── IconRail.tsx
│           │   │   ├── SidebarPanel.tsx
│           │   │   ├── ViewShell.tsx
│           │   │   ├── UsageGauge.tsx
│           │   │   └── panels/
│           │   │       ├── SessionPanel.tsx
│           │   │       ├── TeammatePanel.tsx
│           │   │       └── SkillPanel.tsx
│           │   ├── views/
│           │   │   ├── WelcomeView.tsx
│           │   │   ├── SessionDetailView.tsx
│           │   │   ├── OverviewTab.tsx
│           │   │   ├── OutputTab.tsx
│           │   │   ├── TeammatesTab.tsx
│           │   │   ├── TasksTab.tsx
│           │   │   ├── TeammateDetailView.tsx
│           │   │   ├── TaskDetailView.tsx
│           │   │   ├── TeammateSpecDetailView.tsx
│           │   │   └── SkillSpecDetailView.tsx
│           │   ├── dialogs/
│           │   │   ├── NewSessionDialog.tsx
│           │   │   ├── NewTeammateSpecDialog.tsx
│           │   │   ├── NewSkillSpecDialog.tsx
│           │   │   ├── PluginInstallDialog.tsx
│           │   │   └── ExternalSkillSection.tsx
│           │   ├── output/
│           │   │   ├── MemoMarkdown.tsx
│           │   │   ├── ContentCards.tsx
│           │   │   └── Avatars.tsx
│           │   ├── PermissionDialog.tsx
│           │   ├── PermissionCard.tsx
│           │   ├── PermissionRulesPanel.tsx
│           │   ├── CostTracker.tsx
│           │   ├── DirPicker.tsx
│           │   ├── FileChip.tsx
│           │   ├── FollowUpInput.tsx
│           │   └── ...
│           └── utils/
│               └── twemoji.tsx
├── package.json
├── tsconfig.json
└── README.md
```

## 開発

### 開発サーバー起動

```bash
npm run dev
```

これにより、以下が並列で起動します:
- Server: `http://localhost:7819`（Hono + WebSocket）
- Web: `http://localhost:7820`（Vite dev server）

### ポート設定

| サービス | ポート | 設定箇所 |
|---|---|---|
| Server | 7819 | `packages/server/src/index.ts` |
| Web | 7820 | `packages/web/vite.config.ts` |

### ビルド

```bash
# Web のみビルド
npm run build -w @ccgrid/web

# ビルド後のプレビュー
npm run preview -w @ccgrid/web
```

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

## ライセンス

MIT
