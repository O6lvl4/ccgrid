# ccgrid

A team development management tool powered by Claude Agent SDK. A Lead agent launches and monitors multiple Teammate agents to execute tasks in parallel.

## Overview

ccgrid is a collaborative AI team development environment leveraging the Claude Agent SDK. A single Lead agent manages multiple Teammate agents, executing tasks in parallel to efficiently handle large-scale projects.

## Key Features

### 1. Session Management
- **Lead + Teammate Team Structure**: Lead agent dynamically launches and monitors Teammates
- **Session Resume**: Resume interrupted sessions (`POST /api/sessions/:id/continue`)
- **Cost Tracking**: Real-time display of token usage and costs
- **Usage Gauge**: Visualize usage rate against plan limits in a fuel gauge style

### 2. Teammate Coordination
- **Auto-Discovery**: Automatically detect Teammates via Agent SDK Hooks
- **Task Sync**: Monitor and sync task JSON files at `~/.claude/tasks/{sessionId}/`
- **DM Relay**: Message exchange between Lead ↔ Teammates (WebSocket + REST API)
- **Status Management**: Lifecycle management: `starting` → `working` → `idle` → `stopped`

### 3. Skill & Plugin System
- **3 Skill Types**:
  - `official`: Official Claude skills
  - `external`: Installed from GitHub repositories
  - `internal`: User-defined skills
- **Plugin Management**: Batch install skills by loading `ccgrid-plugin.json` from GitHub repos (e.g., `owner/repo`)
- **Skill Discovery**: Automatically injected into Lead prompt and available to Teammates

### 4. Permission Management
- **Rule-Based Auto-Decision**: `allow` / `deny` rules based on tool name and path patterns
- **Interactive Approval**: UI-based allow/deny selection when no matching rule exists
- **Permission Log**: Record all permission decisions as history (`PermissionLogEntry`)
- **Input Rewriting**: Modify tool input parameters upon approval

### 5. Real-Time Communication (WebSocket)
- **Server → Client**: Instantly deliver session state, Teammate output, task updates, and cost changes
- **Client → Server**: Permission responses and messages to Teammates
- **Snapshot Delivery**: Send complete state snapshot upon connection (`type: 'snapshot'`)

### 6. File Sharing
- **Base64 Encoding**: Send attached files as JSON
- **Image Compression**: Auto-resize large images (max 2048px)
- **Thumbnail Display**: Preview in UI
- **Distribution to Lead + Teammates**: Auto-attach files when creating or continuing sessions

### 7. Performance Optimization
- **Incremental Rendering**: Batch large Teammate outputs using `requestAnimationFrame`
- **Tab Caching**: Cache rendering results for Overview / Output / Teammates / Tasks tabs
- **Skeleton UI**: Display skeleton during data loading
- **File Splitting**: Split large components (IconRail, TasksTab, etc.) to reduce initial load time

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Backend** | Hono | 4.7 |
| | WebSocket (ws) | 8.18 |
| | Claude Agent SDK | 0.2.37 |
| **Frontend** | React | 19.1 |
| | Zustand | 5.0 |
| | Vite | 6.3 |
| | Tailwind CSS | 4.1 |
| **Monorepo** | npm workspaces | - |

## Setup

### Prerequisites
- Node.js 18+ / npm 9+
- Anthropic API key (environment variable `ANTHROPIC_API_KEY`)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ccgrid.git
cd ccgrid

# Install dependencies
npm install

# Start development servers (server + web in parallel)
npm run dev
```

- Server: http://localhost:7819
- Web UI: http://localhost:7820

Open http://localhost:7820 in your browser to view the UI.

## Architecture

### Session Creation Flow

```
1. User enters session settings in NewSessionDialog
   ↓
2. POST /api/sessions → SessionManager.createSession()
   ↓
3. AgentBuilder generates prompt for Lead agent
   - Custom instructions
   - Skill list
   - Teammate Specs
   - File attachments
   ↓
4. Launch Lead agent via Agent SDK (agent.start())
   ↓
5. Detect Teammate discovery, task sync, and cost updates via Hooks
   ↓
6. Deliver state to UI via WebSocket
```

### Teammate Discovery Hooks

Using Agent SDK's `onAgentAction` hook to detect:

- **TeamCreate**: Detect team name and task list directory creation
- **Task Tool Invocation**: Detect Teammate launch → `teammate_discovered` event
- **TaskUpdate**: Detect task completion → `task_completed` event
- **SendMessage**: Detect DM → `teammate_message_relayed` event

### Permission Evaluator Flow

```
1. Agent attempts to execute a tool
   ↓
2. onPermissionRequest hook fires
   ↓
3. PermissionEvaluator makes auto-decision based on rules
   - Match by toolName + pathPattern
   - Immediately allow / deny if rule found
   ↓
4. If no rule found, send permission_request to UI via WebSocket
   ↓
5. User selects Allow / Deny / Modify Input in UI
   ↓
6. Client sends permission_response
   ↓
7. SessionManager resolves Promise
   ↓
8. Return response to Agent SDK
```

## API Endpoints

### REST API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions` | Create session |
| `GET` | `/api/sessions` | List sessions |
| `GET` | `/api/sessions/:id` | Get session details |
| `PATCH` | `/api/sessions/:id` | Update session |
| `DELETE` | `/api/sessions/:id` | Delete session |
| `POST` | `/api/sessions/:id/stop` | Stop session |
| `POST` | `/api/sessions/:id/continue` | Continue session |
| `POST` | `/api/sessions/:id/teammates/:name/message` | Send message to Teammate |
| `GET` | `/api/sessions/:id/teammates` | List Teammates |
| `GET` | `/api/sessions/:id/tasks` | List tasks |
| `GET` | `/api/sessions/:id/permissions` | Get Permission Log |
| `GET` | `/api/teammate-specs` | List Teammate Specs |
| `POST` | `/api/teammate-specs` | Create Teammate Spec |
| `PATCH` | `/api/teammate-specs/:id` | Update Teammate Spec |
| `DELETE` | `/api/teammate-specs/:id` | Delete Teammate Spec |
| `GET` | `/api/skill-specs` | List Skill Specs |
| `POST` | `/api/skill-specs` | Create Skill Spec |
| `DELETE` | `/api/skill-specs/:id` | Delete Skill Spec |
| `GET` | `/api/plugins` | List Plugins |
| `POST` | `/api/plugins/install` | Install plugin from GitHub |
| `DELETE` | `/api/plugins/:name` | Delete plugin |
| `GET` | `/api/permission-rules` | List Permission Rules |
| `POST` | `/api/permission-rules` | Create Permission Rule |
| `DELETE` | `/api/permission-rules/:id` | Delete Permission Rule |
| `GET` | `/api/usage` | Get API usage (ccusage) |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/dirs` | List directories |
| `GET` | `/api/dirs/validate` | Validate directory |

### WebSocket Message Types (Server → Client)

- `snapshot`: Complete state snapshot (on connection)
- `session_created`: Session created
- `session_status`: Session status changed
- `session_deleted`: Session deleted
- `lead_output`: Lead agent output
- `teammate_discovered`: Teammate discovered
- `teammate_status`: Teammate status changed
- `teammate_output`: Teammate output
- `task_sync`: Task synchronized
- `task_completed`: Task completed
- `cost_update`: Cost updated
- `permission_request`: Permission requested
- `permission_resolved`: Permission decision completed
- `permission_rules_updated`: Rules updated
- `teammate_message_relayed`: Teammate message relayed
- `error`: Error occurred

### WebSocket Message Types (Client → Server)

- `permission_response`: Permission response
- `teammate_message`: Send message to Teammate

## Directory Structure

```
ccgrid/
├── packages/
│   ├── shared/          # Shared type definitions
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

## Development

### Start Development Servers

```bash
npm run dev
```

This launches the following in parallel:
- Server: `http://localhost:7819` (Hono + WebSocket)
- Web: `http://localhost:7820` (Vite dev server)

### Port Configuration

| Service | Port | Configuration Location |
|---|---|---|
| Server | 7819 | `packages/server/src/index.ts` |
| Web | 7820 | `packages/web/vite.config.ts` |

### Build

```bash
# Build web only
npm run build -w @ccgrid/web

# Preview after build
npm run preview -w @ccgrid/web
```

## SSH ControlMaster Configuration (Recommended)

When running parallel git operations across multiple repositories within a session, SSH connections can become unstable (`Connection reset by peer`).
Enabling SSH ControlMaster significantly improves stability by reusing a single connection.

Add the following to `~/.ssh/config`:

```ssh-config
Host *
  ControlMaster auto
  ControlPath ~/.ssh/sockets/%r@%h-%p
  ControlPersist 600
```

Create the socket directory:

```bash
mkdir -p ~/.ssh/sockets
```

- **ControlMaster auto** — Reuse the first connection as master. Subsequent connections communicate via socket without new SSH handshakes
- **ControlPersist 600** — Keep master connection alive for 10 minutes after the last session ends

> If a `Host *` block already exists, add the above three lines within that block.

## License

MIT
