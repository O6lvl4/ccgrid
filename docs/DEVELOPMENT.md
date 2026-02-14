# Development Guide

Complete guide for developing, debugging, and contributing to ccgrid.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Building](#building)
- [Testing](#testing)
- [Debugging](#debugging)
- [Code Style](#code-style)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.0.0+ | Runtime environment |
| npm | 9.0.0+ | Package manager |
| Git | 2.30.0+ | Version control |
| Claude CLI | Latest | Agent SDK authentication |

### Optional Tools

| Tool | Purpose |
|------|---------|
| `ccusage` | Monitor Claude API usage |
| VS Code | Recommended IDE with TypeScript support |
| Chrome DevTools | WebSocket debugging |

### System Requirements

- **OS**: macOS, Linux, or Windows with WSL2
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 500MB for dependencies

## Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/ccgrid.git
cd ccgrid
```

### 2. Install Dependencies

ccgrid uses npm workspaces for monorepo management.

```bash
# Install all workspace dependencies
npm install
```

This installs dependencies for:
- Root workspace
- `packages/shared`
- `packages/server`
- `packages/web`

### 3. Configure Authentication

ccgrid requires Claude authentication. Choose one method:

#### Option A: Subscription (Recommended for Development)

```bash
# Login via Claude CLI
claude login
```

This stores credentials in macOS Keychain. No further configuration needed.

#### Option B: API Key

```bash
# Create .env file in repository root
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# Or export directly
export ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Verify Setup

```bash
# Check Node.js version
node --version  # Should be 18+

# Check npm version
npm --version   # Should be 9+

# Check Claude CLI
claude --version

# Test authentication
claude query "Hello, what's the weather?" --max-budget-usd 0.01
```

## Development Workflow

### Start Development Servers

Launch both server and web UI in watch mode:

```bash
npm run dev
```

This runs:
- **Server**: `http://localhost:7819` (Hono + WebSocket)
- **Web UI**: `http://localhost:7820` (Vite dev server with HMR)

Output:

```
> ccgrid@1.0.0 dev
> npm run dev --workspace=@ccgrid/server & npm run dev --workspace=@ccgrid/web

> @ccgrid/server@1.0.0 dev
> tsx watch --tsconfig tsconfig.json src/index.ts

> @ccgrid/web@1.0.0 dev
> vite

Server running on http://localhost:7819
Web UI running on http://localhost:7820
```

### Watch Individual Packages

Run only server:

```bash
npm run dev -w @ccgrid/server
```

Run only web:

```bash
npm run dev -w @ccgrid/web
```

### Hot Module Replacement (HMR)

#### Server HMR

Server uses `tsx watch` for automatic restarts:

1. Edit `/packages/server/src/*.ts`
2. `tsx` detects change and restarts process
3. Active sessions are terminated (by design)
4. WebSocket clients auto-reconnect

#### Web HMR

Web uses Vite HMR for instant updates:

1. Edit `/packages/web/src/*.tsx`
2. Vite hot-reloads the module
3. React component state is preserved (where possible)
4. No page refresh needed

## Project Structure

```
ccgrid/
├── packages/
│   ├── shared/               # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── types.ts      # Type definitions
│   │   │   └── index.ts      # Exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── server/               # Backend (Hono + WebSocket)
│   │   ├── src/
│   │   │   ├── index.ts                  # Entry point, Hono app
│   │   │   ├── session-manager.ts        # Session orchestration
│   │   │   ├── agent-builder.ts          # SDK agent config
│   │   │   ├── permission-evaluator.ts   # Permission system
│   │   │   ├── hook-handlers.ts          # SDK hook callbacks
│   │   │   ├── task-watcher.ts           # File system watcher
│   │   │   ├── transcript-poller.ts      # Teammate output polling
│   │   │   ├── transcript-reader.ts      # Read transcript files
│   │   │   ├── usage-tracker.ts          # ccusage integration
│   │   │   ├── state-store.ts            # Persistence layer
│   │   │   ├── prompt-builder.ts         # Prompt generation
│   │   │   ├── query-helpers.ts          # SDK query utilities
│   │   │   ├── lead-stream.ts            # Lead agent stream processor
│   │   │   └── routes/
│   │   │       ├── sessions.ts           # Session CRUD
│   │   │       ├── specs.ts              # Specs CRUD
│   │   │       └── plugins.ts            # Plugin management
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                  # Frontend (React + Vite)
│       ├── src/
│       │   ├── main.tsx                  # React entry point
│       │   ├── App.tsx                   # Root component
│       │   ├── store.ts                  # Zustand state management
│       │   ├── api.ts                    # REST API client
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   ├── IconRail.tsx      # Left sidebar navigation
│       │   │   │   ├── SidebarPanel.tsx  # Right sidebar container
│       │   │   │   ├── ViewShell.tsx     # Main content wrapper
│       │   │   │   ├── UsageGauge.tsx    # Usage visualization
│       │   │   │   └── panels/
│       │   │   │       ├── SessionPanel.tsx
│       │   │   │       ├── TeammatePanel.tsx
│       │   │   │       └── SkillPanel.tsx
│       │   │   ├── views/
│       │   │   │   ├── WelcomeView.tsx
│       │   │   │   ├── SessionDetailView.tsx
│       │   │   │   ├── OverviewTab.tsx
│       │   │   │   ├── OutputTab.tsx
│       │   │   │   ├── TeammatesTab.tsx
│       │   │   │   ├── TasksTab.tsx
│       │   │   │   ├── TeammateDetailView.tsx
│       │   │   │   ├── TaskDetailView.tsx
│       │   │   │   ├── TeammateSpecDetailView.tsx
│       │   │   │   └── SkillSpecDetailView.tsx
│       │   │   ├── dialogs/
│       │   │   │   ├── NewSessionDialog.tsx
│       │   │   │   ├── NewTeammateSpecDialog.tsx
│       │   │   │   ├── NewSkillSpecDialog.tsx
│       │   │   │   ├── PluginInstallDialog.tsx
│       │   │   │   └── ExternalSkillSection.tsx
│       │   │   ├── output/
│       │   │   │   ├── MemoMarkdown.tsx    # Memoized markdown renderer
│       │   │   │   ├── ContentCards.tsx    # Tool output cards
│       │   │   │   └── Avatars.tsx         # Agent avatars
│       │   │   ├── PermissionDialog.tsx
│       │   │   ├── PermissionCard.tsx
│       │   │   ├── PermissionRulesPanel.tsx
│       │   │   ├── CostTracker.tsx
│       │   │   ├── DirPicker.tsx
│       │   │   ├── FileChip.tsx
│       │   │   ├── FollowUpInput.tsx
│       │   │   └── ...
│       │   └── utils/
│       │       └── twemoji.tsx
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── postcss.config.mjs
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md       # System architecture
│   ├── API.md                # API reference
│   ├── DEVELOPMENT.md        # This file
│   └── agent-sdk-architecture.md
│
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
│
├── package.json              # Root workspace config
├── tsconfig.json             # Root TypeScript config
├── .gitignore
└── README.md
```

## Building

### Build All Packages

```bash
npm run build
```

This builds:
- `packages/shared` → `dist/`
- `packages/web` → `dist/`

**Note**: Server does not need building for development (`tsx` compiles on-the-fly).

### Build Individual Packages

```bash
# Build web only
npm run build -w @ccgrid/web

# Build shared types only
npm run build -w @ccgrid/shared
```

### Production Build

```bash
# Clean previous builds
rm -rf packages/*/dist

# Build all
npm run build

# Preview web build
npm run preview -w @ccgrid/web
```

Preview server runs at `http://localhost:4173`.

## Testing

### Manual Testing

ccgrid currently relies on manual testing. Recommended test scenarios:

#### 1. Session Creation

```
1. Open http://localhost:7820
2. Click "New Session"
3. Fill in:
   - Name: "Test Session"
   - Directory: Choose a test project
   - Model: claude-sonnet-4-5-20250929
   - Task: "List all TypeScript files"
4. Click "Start Session"
5. Verify:
   - Session appears in sidebar
   - Status changes to "running"
   - Lead output appears
   - Cost updates
```

#### 2. Teammate Discovery

```
1. Create session with Teammate Specs
2. Wait for Lead to create team
3. Verify:
   - Teammates appear in sidebar
   - Status updates (starting → working → idle)
   - Output appears in Teammates tab
```

#### 3. Permission Flow

```
1. Create session
2. Wait for permission request
3. In PermissionDialog:
   - Test "Allow"
   - Test "Deny"
   - Test "Modify Input"
4. Verify:
   - Decision logged in Permission tab
   - Agent continues/stops appropriately
```

#### 4. WebSocket Reconnection

```
1. Create running session
2. Open browser DevTools Network tab
3. Stop and restart server
4. Verify:
   - WebSocket reconnects automatically
   - State snapshot received
   - UI updates correctly
```

### Unit Testing (TODO)

Add unit tests using Vitest:

```bash
# Install Vitest
npm install -D vitest @vitest/ui

# Add test script to package.json
{
  "scripts": {
    "test": "vitest"
  }
}

# Run tests
npm test
```

Example test structure:

```typescript
// packages/server/src/__tests__/session-manager.test.ts
import { describe, it, expect } from 'vitest';
import { SessionManager } from '../session-manager';

describe('SessionManager', () => {
  it('should create a session', async () => {
    const sm = new SessionManager(() => {});
    const session = await sm.createSession({
      name: 'Test',
      cwd: '/tmp',
      model: 'claude-sonnet-4-5-20250929',
      taskDescription: 'Test task'
    });
    expect(session.id).toBeDefined();
    expect(session.status).toBe('starting');
  });
});
```

## Debugging

### Server Debugging

#### VS Code Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev", "-w", "@ccgrid/server"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

Set breakpoints in VS Code and press F5.

#### Console Logging

```typescript
// Enable debug logging
console.log(`[session-manager] Creating session: ${name}`);
console.log(`[canUseTool] tool=${toolName} agent=${agentId}`);
```

Prefix logs with component name for easy filtering:

```bash
# Filter server logs
npm run dev -w @ccgrid/server 2>&1 | grep "\[session-manager\]"
```

#### Inspect Agent SDK Messages

Log all SDK messages in `lead-stream.ts`:

```typescript
export async function processLeadStream(...) {
  for await (const message of agentQuery) {
    console.log('[SDK Message]', JSON.stringify(message, null, 2));
    // ...
  }
}
```

### Web Debugging

#### React DevTools

Install [React DevTools](https://react.dev/learn/react-developer-tools) browser extension.

Features:
- Inspect component tree
- View props and state
- Profile rendering performance

#### Zustand DevTools

Add Redux DevTools integration:

```typescript
// In store.ts
import { devtools } from 'zustand/middleware';

export const useStore = create<State>()(
  devtools(
    (set, get) => ({
      // ... existing store
    }),
    { name: 'ccgrid-store' }
  )
);
```

Install [Redux DevTools](https://github.com/reduxjs/redux-devtools) browser extension.

#### WebSocket Debugging

Chrome DevTools Network tab:

1. Open DevTools (F12)
2. Navigate to Network tab
3. Filter by "WS" (WebSocket)
4. Click on WebSocket connection
5. View Messages tab

Inspect all messages:

```
↑ Sent:
{"type":"permission_response","requestId":"...","behavior":"allow"}

↓ Received:
{"type":"lead_output","sessionId":"...","text":"..."}
```

#### Vite Debug Logs

Enable Vite debugging:

```bash
DEBUG=vite:* npm run dev -w @ccgrid/web
```

### Debug Agent SDK

Enable Agent SDK debug logging:

```typescript
// In session-manager.ts
query({
  options: {
    env: {
      ...process.env,
      DEBUG: 'claude-agent-sdk:*'
    }
  }
});
```

### Inspect Persisted State

Session files:

```bash
# List all sessions
ls -la ~/.ccgrid/sessions/

# View session details
cat ~/.ccgrid/sessions/{sessionId}.json | jq
```

Task files:

```bash
# List tasks for session
ls -la ~/.claude/tasks/{sessionId}/

# View task details
cat ~/.claude/tasks/{sessionId}/1.json | jq
```

Teammate transcripts:

```bash
# View transcript
cat ~/.claude/sessions/{agentId}/transcript.jsonl | jq
```

## Code Style

### TypeScript

- **Strict mode**: Enabled in `tsconfig.json`
- **No implicit any**: All parameters must have types
- **Interfaces over types**: Use `interface` for object shapes
- **Explicit return types**: Required for public functions

```typescript
// Good
export function createSession(opts: CreateSessionOpts): Promise<Session> {
  // ...
}

// Bad
export function createSession(opts) {
  // ...
}
```

### React

- **Functional components**: No class components
- **Hooks**: Use hooks for state and effects
- **Prop types**: Define explicit types

```tsx
// Good
interface SessionCardProps {
  session: Session;
  onDelete: (id: string) => void;
}

export function SessionCard({ session, onDelete }: SessionCardProps) {
  // ...
}

// Bad
export function SessionCard(props: any) {
  // ...
}
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `session-manager.ts` |
| Components | PascalCase | `SessionCard.tsx` |
| Functions | camelCase | `createSession()` |
| Interfaces | PascalCase | `SessionManager` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |

### Import Order

1. External libraries
2. Internal packages (`@ccgrid/*`)
3. Relative imports

```typescript
// External
import { query } from '@anthropic-ai/claude-agent-sdk';
import { v4 as uuidv4 } from 'uuid';

// Internal
import type { Session } from '@ccgrid/shared';

// Relative
import { buildPrompt } from './prompt-builder.js';
import { processLeadStream } from './lead-stream.js';
```

### Formatting

Install Prettier:

```bash
npm install -D prettier
```

Create `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

Format code:

```bash
npx prettier --write "packages/**/*.{ts,tsx}"
```

## Common Tasks

### Add a New REST Endpoint

1. **Define route in server**:

```typescript
// packages/server/src/routes/sessions.ts
app.get('/:id/logs', (c) => {
  const session = sm.getSession(c.req.param('id'));
  if (!session) return c.json({ error: 'Not found' }, 404);
  const logs = sm.getLogs(c.req.param('id'));
  return c.json(logs);
});
```

2. **Add method to SessionManager**:

```typescript
// packages/server/src/session-manager.ts
getLogs(sessionId: string): LogEntry[] {
  return this.logs.get(sessionId) ?? [];
}
```

3. **Update API client**:

```typescript
// packages/web/src/api.ts
export async function getSessionLogs(sessionId: string): Promise<LogEntry[]> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/logs`);
  return response.json();
}
```

4. **Use in component**:

```tsx
// packages/web/src/components/views/LogsTab.tsx
const logs = await getSessionLogs(sessionId);
```

### Add a New WebSocket Message Type

1. **Define type in shared**:

```typescript
// packages/shared/src/types.ts
export type ServerMessage =
  | ... // existing types
  | { type: 'log_entry'; sessionId: string; entry: LogEntry };
```

2. **Broadcast from server**:

```typescript
// packages/server/src/session-manager.ts
this.broadcast({
  type: 'log_entry',
  sessionId,
  entry: { level: 'info', message: '...' }
});
```

3. **Handle in web**:

```typescript
// packages/web/src/store.ts
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'log_entry') {
    set(state => ({
      logs: [...state.logs, msg.entry]
    }));
  }
};
```

### Add a New Component

1. **Create component file**:

```tsx
// packages/web/src/components/LogViewer.tsx
interface LogViewerProps {
  logs: LogEntry[];
}

export function LogViewer({ logs }: LogViewerProps) {
  return (
    <div className="space-y-2">
      {logs.map((log, i) => (
        <div key={i} className="p-2 bg-gray-100 rounded">
          <span className="font-mono text-xs">{log.timestamp}</span>
          <span className="ml-2">{log.message}</span>
        </div>
      ))}
    </div>
  );
}
```

2. **Import and use**:

```tsx
// packages/web/src/components/views/SessionDetailView.tsx
import { LogViewer } from '../LogViewer';

// In component
<LogViewer logs={session.logs} />
```

### Add a Teammate Spec

Create via UI or directly:

```typescript
// Via API
const spec = await createTeammateSpec({
  name: 'security-auditor',
  role: 'Security specialist',
  instructions: 'Analyze code for security vulnerabilities',
  skillIds: ['skill-static-analysis', 'skill-cve-lookup']
});
```

Stored in `~/.ccgrid/teammate-specs.json`.

### Add a Skill Spec

Create internal skill:

```typescript
const skill = await createSkillSpec({
  name: 'custom-linter',
  description: 'Run ESLint with custom rules',
  skillType: 'internal',
  skillMdContent: `# Custom Linter

Execute ESLint with project-specific rules.

## Usage

\`\`\`
eslint --config .eslintrc.custom.js src/**/*.ts
\`\`\`
  `,
  allowedTools: 'Bash,Read',
  argumentHint: 'target:string'
});
```

Install external skill via plugin:

```bash
POST /api/plugins/install
{
  "source": "username/ccgrid-plugin-eslint"
}
```

## Troubleshooting

### Server Won't Start

**Symptom**: `Error: listen EADDRINUSE: address already in use :::7819`

**Cause**: Port 7819 already in use.

**Solution**:

```bash
# Find process using port
lsof -i :7819

# Kill process
kill -9 <PID>

# Or change port in packages/server/src/index.ts
const PORT = 7820; // Use different port
```

### Web Build Fails

**Symptom**: `Error: Cannot find module '@ccgrid/shared'`

**Cause**: Shared package not built.

**Solution**:

```bash
# Build shared package first
npm run build -w @ccgrid/shared

# Then build web
npm run build -w @ccgrid/web
```

### WebSocket Connection Refused

**Symptom**: `WebSocket connection to 'ws://localhost:7819' failed`

**Cause**: Server not running or firewall blocking.

**Solution**:

```bash
# Verify server is running
curl http://localhost:7819/api/health

# Check firewall (macOS)
sudo pfctl -s rules | grep 7819

# Disable firewall temporarily
sudo pfctl -d
```

### Agent SDK Authentication Fails

**Symptom**: `Error: Authentication failed`

**Cause**: No valid credentials.

**Solution**:

```bash
# Login again
claude login

# Or set API key
export ANTHROPIC_API_KEY=sk-ant-...

# Verify
claude query "test" --max-budget-usd 0.01
```

### High Memory Usage

**Symptom**: Node.js process using excessive memory.

**Cause**: Large session state or memory leak.

**Solution**:

```bash
# Restart server
# Delete old sessions
rm ~/.ccgrid/sessions/*.json

# Monitor memory
node --max-old-space-size=4096 packages/server/src/index.ts
```

### Teammates Not Discovered

**Symptom**: Lead agent creates Teammates but they don't appear in UI.

**Cause**: Hook handlers not firing or WebSocket disconnected.

**Solution**:

1. Check server logs for `[hook:SubagentStart]`
2. Verify WebSocket connected in browser DevTools
3. Ensure `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` env var set
4. Check `~/.claude/teams/` directory for team config

### Tasks Not Syncing

**Symptom**: Task changes not reflected in UI.

**Cause**: File watcher not running or WebSocket disconnected.

**Solution**:

1. Check server logs for `[task-watcher]`
2. Verify `~/.claude/tasks/{sessionId}/` exists
3. Manually trigger sync by refreshing session

## Contributing

### Contribution Workflow

1. **Fork the repository**

```bash
git clone https://github.com/yourusername/ccgrid.git
cd ccgrid
git remote add upstream https://github.com/originalowner/ccgrid.git
```

2. **Create a feature branch**

```bash
git checkout -b feature/my-feature
```

3. **Make changes**

- Write code
- Add tests (when test infrastructure is added)
- Update documentation

4. **Commit changes**

Follow commit message convention (defined in CLAUDE.md):

```bash
# Good: Simple, descriptive Japanese
git commit -m "セッション詳細画面にログタブを追加"

# Bad: Prefixed or overly complex
git commit -m "feat: add logs tab to session detail view"
```

5. **Push and create PR**

```bash
git push origin feature/my-feature
```

Open PR on GitHub with:
- Description of changes
- Screenshots (if UI changes)
- Testing performed

### PR Review Process

1. Automated checks (TODO: add CI)
2. Code review by maintainer
3. Address feedback
4. Merge when approved

### Areas for Contribution

#### High Priority

- [ ] Add unit tests (Vitest)
- [ ] Add integration tests
- [ ] Implement authentication system
- [ ] Add rate limiting
- [ ] Performance profiling and optimization
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)

#### Features

- [ ] Session templates (save/load session configurations)
- [ ] Export session transcripts
- [ ] Custom skill editor with syntax highlighting
- [ ] Multi-user support
- [ ] Session sharing via links
- [ ] Webhook integrations (Slack, Discord)

#### Documentation

- [ ] Video tutorials
- [ ] Interactive playground
- [ ] API client examples (Python, JavaScript)
- [ ] Deployment guides (Docker, Kubernetes)

### Code of Conduct

- Be respectful and constructive
- Welcome newcomers
- Focus on the code, not the person
- Provide clear, actionable feedback

## Additional Resources

### Internal Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture deep dive
- [API.md](./API.md) - Complete API reference
- [agent-sdk-architecture.md](./agent-sdk-architecture.md) - Agent SDK integration details

### External Resources

- [Claude Agent SDK Docs](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Hono Documentation](https://hono.dev/)
- [React Documentation](https://react.dev/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

### Community

- GitHub Issues: Report bugs and request features
- GitHub Discussions: Ask questions and share ideas
- Pull Requests: Contribute code

## License

MIT License. See [LICENSE](../LICENSE) for details.
