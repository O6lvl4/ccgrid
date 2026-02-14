# ccgrid Architecture

This document provides a comprehensive overview of ccgrid's system architecture, including session management, teammate coordination, permission evaluation, and real-time communication.

## Table of Contents

- [System Overview](#system-overview)
- [Core Components](#core-components)
- [Session Creation Flow](#session-creation-flow)
- [Teammate Discovery](#teammate-discovery)
- [Permission Evaluation](#permission-evaluation)
- [WebSocket Communication](#websocket-communication)
- [File Attachment System](#file-attachment-system)
- [Task Synchronization](#task-synchronization)
- [Cost Tracking](#cost-tracking)

## System Overview

ccgrid is a collaborative AI development environment that leverages the Claude Agent SDK to manage teams of AI agents working in parallel. The architecture follows a Lead-Teammate pattern where:

- **Lead Agent**: Coordinates overall project execution, distributes work, and aggregates results
- **Teammate Agents**: Specialized agents that execute specific tasks in parallel
- **Server**: Node.js/Hono backend managing sessions, WebSocket connections, and state persistence
- **Web Client**: React-based UI for monitoring and controlling agent teams

```
┌─────────────────────────────────────────────────────────────┐
│                         Web Client                          │
│              (React + Zustand + WebSocket)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP + WebSocket
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Server (Hono)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Session    │  │  Permission  │  │    Task      │     │
│  │   Manager    │  │  Evaluator   │  │   Watcher    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└──────────────────────┬──────────────────────────────────────┘
                       │ Agent SDK
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Claude Agent SDK (query())                     │
│                    ↓                                        │
│           Claude Code CLI (subprocess)                      │
│                    ↓                                        │
│              Anthropic API                                  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### SessionManager

The central orchestrator managing agent lifecycles and state.

**Location**: `/packages/server/src/session-manager.ts`

**Responsibilities**:
- Create and manage sessions (CRUD operations)
- Launch Lead agents via Agent SDK
- Track Teammates discovered via hooks
- Coordinate permission requests
- Broadcast state changes via WebSocket
- Persist session state to disk

**Key Methods**:

```typescript
class SessionManager {
  // Create a new session with Lead agent
  async createSession(opts: {
    name: string;
    cwd: string;
    model: string;
    teammateSpecs?: TeammateSpec[];
    maxBudgetUsd?: number;
    taskDescription: string;
    permissionMode?: 'acceptEdits' | 'bypassPermissions';
    skillSpecs?: SkillSpec[];
    customInstructions?: string;
    files?: FileAttachment[];
  }): Promise<Session>;

  // Continue an existing session with new prompt
  continueSession(
    sessionId: string,
    prompt: string,
    files?: FileAttachment[]
  ): Session | undefined;

  // Stop a running session
  async stopSession(sessionId: string): Promise<void>;

  // Send message to a specific Teammate
  sendToTeammate(
    sessionId: string,
    teammateName: string,
    message: string
  ): Session | undefined;

  // Handle permission responses from UI
  respondToPermission(
    requestId: string,
    behavior: 'allow' | 'deny',
    message?: string,
    updatedInput?: Record<string, unknown>
  ): void;
}
```

**State Storage**:

Sessions are persisted to `~/.ccgrid/sessions/{sessionId}.json`:

```json
{
  "sessionId": "abc-123",
  "session": { "id": "...", "name": "...", "status": "running", ... },
  "teammates": [
    { "agentId": "xyz-456", "name": "researcher", "status": "working", ... }
  ],
  "tasks": [
    { "id": "1", "subject": "...", "status": "in_progress", ... }
  ],
  "leadOutput": "... accumulated output text ..."
}
```

### AgentBuilder

Constructs the agent configuration for the Claude Agent SDK.

**Location**: `/packages/server/src/agent-builder.ts`

**Functionality**:

1. **Build Teammate Specs**: Converts user-defined Teammate specs into SDK agent configuration
2. **Inject Team Context**: Adds team awareness to each Teammate's prompt
3. **Skill Assignment**: Associates skills with specific Teammates
4. **File Attachment Handling**: Converts uploaded files to SDK ContentBlocks

**Example Output**:

```typescript
buildAgents(teammateSpecs, skillSpecs) returns:
{
  "researcher": {
    description: "Research specialist",
    prompt: "You are a research specialist. Focus on gathering information...\n\n## TEAM CONTEXT\nYou are a member of a team. Other members:\n- tester: QA specialist\n- developer: Implementation expert\n\nThe Lead coordinates...",
    skills: ["web-search", "pdf-reader"]
  },
  "tester": {
    description: "QA specialist",
    prompt: "...",
    skills: ["test-runner"]
  }
}
```

### PermissionEvaluator

Implements rule-based and interactive permission approval for tool execution.

**Location**: `/packages/server/src/permission-evaluator.ts`

**Flow**:

1. Agent attempts tool execution
2. SDK calls `canUseTool(toolName, input, options)`
3. Check auto-allow rules (e.g., Read on user-attached files)
4. Match against permission rules (tool name + path pattern)
5. If no match, send `permission_request` to UI via WebSocket
6. Wait for user response (`permission_response`)
7. Return approval/denial to SDK

**Rule Matching**:

```typescript
// Permission Rule structure
interface PermissionRule {
  id: string;
  toolName: string;        // e.g., "Write", "Bash", "*" (wildcard)
  pathPattern?: string;    // e.g., "**/*.test.ts", "/tmp/**"
  behavior: 'allow' | 'deny';
}

// Example rules
[
  { toolName: "Read", pathPattern: "**/*.md", behavior: "allow" },
  { toolName: "Write", pathPattern: "/etc/**", behavior: "deny" },
  { toolName: "Bash", pathPattern: undefined, behavior: "allow" }
]
```

**Auto-Allow Special Cases**:

- `Read` tool on files in `/tmp/claude-team-files/` (user attachments)
- Prevents permission prompts for every attached file read

### Hook Handlers

Intercept Agent SDK events to track Teammates and tasks.

**Location**: `/packages/server/src/hook-handlers.ts`

**Key Hooks**:

```typescript
hooks: {
  // Fires when Lead launches a Teammate
  SubagentStart: async (event) => {
    const teammate: Teammate = {
      agentId: event.agentId,
      sessionId,
      name: event.agentName,
      agentType: event.agentType,
      status: 'starting',
      transcriptPath: event.transcriptPath
    };
    teammates.set(event.agentId, teammate);
    broadcast({ type: 'teammate_discovered', sessionId, teammate });
  },

  // Fires when Teammate stops
  SubagentStop: async (event) => {
    const teammate = teammates.get(event.agentId);
    if (teammate) {
      teammate.status = 'stopped';
      broadcast({ type: 'teammate_status', sessionId, agentId, status: 'stopped' });
    }
  },

  // Fires when Teammate goes idle (waiting for work)
  TeammateIdle: async (event) => {
    // Update status, trigger output polling
  },

  // Fires when task marked as completed
  TaskCompleted: async (event) => {
    broadcast({ type: 'task_completed', sessionId, taskId, taskSubject });
  }
}
```

### Task Watcher

Monitors `~/.claude/tasks/{sessionId}/` for task file changes.

**Location**: `/packages/server/src/task-watcher.ts`

**Implementation**:

```typescript
export function startTaskWatcher(
  sessionId: string,
  cwd: string,
  onTasksChanged: (tasks: TeamTask[]) => void
): void {
  const taskDir = path.join(os.homedir(), '.claude', 'tasks', sessionId);

  // Watch for file changes
  fs.watch(taskDir, (eventType, filename) => {
    if (filename?.endsWith('.json')) {
      const tasks = syncTasks(sessionId);
      onTasksChanged(tasks);
    }
  });
}

export function syncTasks(sessionId: string): TeamTask[] {
  const taskDir = path.join(os.homedir(), '.claude', 'tasks', sessionId);
  const files = fs.readdirSync(taskDir).filter(f => f.endsWith('.json'));

  return files.map(file => {
    const content = fs.readFileSync(path.join(taskDir, file), 'utf-8');
    return JSON.parse(content) as TeamTask;
  });
}
```

**Task File Format** (`~/.claude/tasks/{sessionId}/{taskId}.json`):

```json
{
  "id": "1",
  "subject": "Research authentication methods",
  "description": "Investigate OAuth 2.0 vs API key authentication",
  "status": "in_progress",
  "assignedAgentId": "researcher-xyz",
  "blocks": [],
  "blockedBy": ["2"]
}
```

## Session Creation Flow

```
┌─────────┐  1. POST /api/sessions  ┌────────────────┐
│   UI    ├────────────────────────►│ SessionManager │
└─────────┘                          └────────┬───────┘
                                              │
                                              │ 2. createSession()
                                              ▼
                                   ┌──────────────────────┐
                                   │   AgentBuilder       │
                                   │ - buildPrompt()      │
                                   │ - buildAgents()      │
                                   │ - filesToContentBlk()│
                                   └──────────┬───────────┘
                                              │
                                              │ 3. query({ prompt, options })
                                              ▼
                                   ┌──────────────────────┐
                                   │   Agent SDK          │
                                   │ - Spawn CLI process  │
                                   │ - Start agent loop   │
                                   └──────────┬───────────┘
                                              │
                                              │ 4. Stream events
                                              ▼
                                   ┌──────────────────────┐
                                   │  LeadStreamProcessor │
                                   │ - assistant messages │
                                   │ - tool executions    │
                                   │ - cost updates       │
                                   └──────────┬───────────┘
                                              │
                                              │ 5. Broadcast state changes
                                              ▼
                                   ┌──────────────────────┐
                                   │    WebSocket         │
                                   │ - lead_output        │
                                   │ - teammate_discovered│
                                   │ - cost_update        │
                                   └──────────────────────┘
```

**Detailed Steps**:

1. **UI Submission**: User fills NewSessionDialog and submits
2. **Session Creation**:
   - Generate unique session ID
   - Save initial session state
   - Broadcast `session_created`
3. **Prompt Building**:
   - Combine task description
   - Inject custom instructions
   - Add Teammate specs
   - Add skill specifications
   - Attach files as ContentBlocks
4. **SDK Launch**:
   ```typescript
   const agentQuery = query({
     prompt: buildPrompt(...),
     options: {
       cwd: session.cwd,
       model: session.model,
       agents: buildAgents(teammateSpecs, skillSpecs),
       permissionMode: session.permissionMode,
       canUseTool: createCanUseTool(...),
       hooks: createHookHandlers(...),
       env: {
         ...process.env,
         CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1'
       }
     }
   });
   ```
5. **Stream Processing**: `processLeadStream()` consumes async iterator
6. **State Updates**: Broadcast to all connected WebSocket clients

## Teammate Discovery

Teammates are discovered dynamically when the Lead agent uses the `Task` tool to create them.

**Discovery Process**:

```
Lead Agent
  ↓
  Uses Task tool with team_name and name parameters
  ↓
Agent SDK
  ↓
  Fires SubagentStart hook
  ↓
SessionManager
  ↓
  Creates Teammate record
  ↓
  Broadcasts teammate_discovered
  ↓
UI updates Teammates list
```

**Teammate Lifecycle States**:

```
starting → working → idle → stopped
   ↓          ↓        ↓
   └──────────┴────────┘
   (can cycle between working/idle)
```

**Transcript Polling**:

When a Teammate goes `idle`, start polling their transcript file:

```typescript
// packages/server/src/transcript-poller.ts
export function startPolling(
  sessionId: string,
  agentId: string,
  transcriptPath: string,
  deps: PollerDeps
): void {
  const interval = setInterval(async () => {
    const newOutput = await readTeammateTranscript(...);
    if (newOutput !== lastOutput) {
      lastOutput = newOutput;
      deps.broadcast({
        type: 'teammate_output',
        sessionId,
        agentId,
        text: newOutput
      });
    }
  }, 2000); // Poll every 2 seconds
}
```

## Permission Evaluation

### Rule-Based Auto-Decision

Permission rules enable automatic approval/denial without UI interaction:

```typescript
// Example: Auto-allow all Read operations on markdown files
{
  id: "rule-1",
  toolName: "Read",
  pathPattern: "**/*.md",
  behavior: "allow"
}

// Example: Auto-deny all Write operations in /etc
{
  id: "rule-2",
  toolName: "Write",
  pathPattern: "/etc/**",
  behavior: "deny"
}

// Example: Wildcard - auto-allow all Bash commands
{
  id: "rule-3",
  toolName: "*",
  pathPattern: undefined,
  behavior: "allow"
}
```

### Interactive Approval Flow

When no rule matches:

1. **Server**: Send `permission_request` to UI
   ```json
   {
     "type": "permission_request",
     "sessionId": "abc-123",
     "requestId": "req-456",
     "toolName": "Write",
     "input": { "file_path": "/src/app.ts", "content": "..." },
     "description": "Write new application entry point",
     "agentId": "lead"
   }
   ```

2. **UI**: Display PermissionDialog with options:
   - Allow
   - Deny
   - Modify Input (edit tool parameters before approval)

3. **Client**: Send response
   ```json
   {
     "type": "permission_response",
     "requestId": "req-456",
     "behavior": "allow",
     "updatedInput": { "file_path": "/src/app.ts", "content": "..." }
   }
   ```

4. **Server**: Resolve Promise, return to SDK

### Input Rewriting

Users can modify tool input before approval:

```typescript
// Original request
{ toolName: "Bash", input: { command: "rm -rf /important" } }

// User modifies in UI
{ command: "rm -rf /tmp/cache" }

// Server returns modified input to SDK
canUseTool() returns {
  behavior: 'allow',
  updatedInput: { command: "rm -rf /tmp/cache" }
}
```

## WebSocket Communication

### Connection Lifecycle

```
Client connects
  ↓
Server sends 'snapshot' message (full state)
  ↓
Client subscribes to real-time updates
  ↓
Bidirectional event flow
  ↓
Client disconnects (cleanup subscriptions)
```

### Server → Client Messages

**Snapshot** (on connection):
```json
{
  "type": "snapshot",
  "sessions": [...],
  "teammates": [...],
  "tasks": { "sessionId": [...] },
  "leadOutputs": { "sessionId": "..." },
  "teammateSpecs": [...],
  "skillSpecs": [...],
  "plugins": [...],
  "permissionRules": [...]
}
```

**Incremental Updates**:
- `session_created`, `session_status`, `session_deleted`
- `lead_output` (append to Lead's output)
- `teammate_discovered`, `teammate_status`, `teammate_output`
- `task_sync`, `task_completed`
- `cost_update`
- `permission_request`, `permission_resolved`
- `teammate_message_relayed`

### Client → Server Messages

**Permission Response**:
```json
{
  "type": "permission_response",
  "requestId": "req-456",
  "behavior": "allow",
  "updatedInput": { ... }
}
```

**Teammate Message**:
```json
{
  "type": "teammate_message",
  "sessionId": "abc-123",
  "teammateName": "researcher",
  "message": "What's the status of task #3?"
}
```

## File Attachment System

### File Upload Flow

1. User selects files in NewSessionDialog
2. Files are read as base64 in browser
3. Sent to server via POST `/api/sessions`
4. Server saves to `/tmp/claude-team-files/{sessionId}/`
5. Converted to SDK ContentBlocks
6. Injected into Lead prompt

### File Types

**Images**:
```typescript
{
  type: 'image',
  source: {
    type: 'base64',
    media_type: 'image/jpeg',
    data: '...'
  }
}
```

**PDFs**:
```typescript
{
  type: 'document',
  source: {
    type: 'base64',
    media_type: 'application/pdf',
    data: '...'
  },
  title: 'requirements.pdf'
}
```

**Text Files**:
```typescript
{
  type: 'document',
  source: {
    type: 'text',
    media_type: 'text/plain',
    data: 'file content as UTF-8 string'
  },
  title: 'config.txt'
}
```

### Auto-Allow on Attachments

```typescript
// In permission-evaluator.ts
if (toolName === 'Read' && filePath.startsWith('/tmp/claude-team-files/')) {
  return Promise.resolve({ behavior: 'allow' });
}
```

This prevents UI permission prompts when agents read user-uploaded files.

## Task Synchronization

### Directory Structure

```
~/.claude/tasks/
└── {sessionId}/
    ├── 1.json        # Task ID 1
    ├── 2.json        # Task ID 2
    └── 3.json        # Task ID 3
```

### File Watching

```typescript
fs.watch(taskDir, (eventType, filename) => {
  // Debounce rapid changes
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const tasks = syncTasks(sessionId);
    broadcast({ type: 'task_sync', sessionId, tasks });
  }, 500);
});
```

### Task Dependencies

Tasks can block each other:

```json
{
  "id": "3",
  "subject": "Implement feature X",
  "status": "pending",
  "blocks": ["4", "5"],      // This task blocks 4 and 5
  "blockedBy": ["1", "2"]    // This task is blocked by 1 and 2
}
```

UI displays blocked tasks with reduced opacity and "Blocked by" badges.

## Cost Tracking

### Token Accumulation

Agent SDK emits cost updates via system messages:

```typescript
// In lead-stream.ts
if (message.type === 'system' && message.data.usageSummary) {
  const { inputTokens, outputTokens, costUsd } = message.data.usageSummary;
  session.inputTokens += inputTokens;
  session.outputTokens += outputTokens;
  session.costUsd += costUsd;

  broadcast({
    type: 'cost_update',
    sessionId,
    costUsd: session.costUsd,
    inputTokens: session.inputTokens,
    outputTokens: session.outputTokens
  });
}
```

### Budget Enforcement

```typescript
query({
  options: {
    maxBudgetUsd: session.maxBudgetUsd,
    // SDK automatically stops when budget exceeded
  }
});
```

### UI Display

- **CostTracker**: Real-time token and USD display
- **UsageGauge**: Fuel gauge visualization of plan limits
- **Session Detail**: Per-session cost breakdown

## State Persistence

### Storage Locations

```
~/.ccgrid/
├── sessions/
│   ├── abc-123.json
│   └── def-456.json
├── teammate-specs.json
├── skill-specs.json
├── plugins.json
└── permission-rules.json
```

### Session Recovery

On server restart:

1. Load all session files from `~/.ccgrid/sessions/`
2. Mark any `starting` or `running` sessions as `completed`
3. Recover Teammate outputs from transcript files
4. Restore UI state via WebSocket snapshot

### Debounced Persistence

```typescript
persistSessionDebounced(sessionId: string): void {
  if (this.persistTimers.has(sessionId)) return;

  this.persistTimers.set(sessionId, setTimeout(() => {
    this.persistTimers.delete(sessionId);
    this.persistSession(sessionId);
  }, 3000)); // Write after 3 seconds of inactivity
}
```

This prevents excessive disk I/O during rapid state changes.

## Performance Optimizations

### 1. Incremental UI Rendering

Large Teammate outputs are batched using `requestAnimationFrame`:

```typescript
// In OutputTab.tsx
let buffer = '';
const flushBuffer = () => {
  if (buffer.length > 0) {
    setDisplayedOutput(prev => prev + buffer);
    buffer = '';
  }
};

const rafId = requestAnimationFrame(flushBuffer);
```

### 2. Tab Caching

Rendered content is cached when switching tabs:

```typescript
const [cachedContent, setCachedContent] = useState({
  overview: null,
  output: null,
  teammates: null,
  tasks: null
});
```

### 3. Skeleton UI

Display loading placeholders during data fetch:

```tsx
{isLoading ? (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-200 rounded w-1/2" />
  </div>
) : (
  <ActualContent />
)}
```

### 4. Code Splitting

Large components are lazy-loaded:

```typescript
const TasksTab = lazy(() => import('./components/views/TasksTab'));
const IconRail = lazy(() => import('./components/layout/IconRail'));
```

## Security Considerations

### Permission System

- **Default Deny**: All tools require explicit approval unless auto-allowed by rules
- **Path Validation**: Prevent path traversal attacks in permission rules
- **Input Sanitization**: Validate all WebSocket messages before processing

### File Attachment Sandbox

- Attachments stored in isolated `/tmp/claude-team-files/` directory
- Auto-cleaned on server restart
- Size limits enforced (images compressed to max 2048px)

### Environment Isolation

- Each session runs in its specified `cwd`
- Agent SDK enforces sandbox boundaries
- No access to parent directories without explicit Read/Write approval

## Extension Points

### Custom Skills

Add new skills via Skill Specs:

```typescript
{
  id: "custom-skill-1",
  name: "database-query",
  skillType: "internal",
  description: "Query PostgreSQL database",
  skillMdContent: "# Database Query\n\nExecute SQL queries...",
  allowedTools: "Bash,Read",
  argumentHint: "sql_query:string"
}
```

### Plugin System

Install skill bundles from GitHub:

```bash
POST /api/plugins/install
{
  "source": "username/repo-name",
  "alias": "my-plugin"
}
```

Server fetches `ccgrid-plugin.json` from repo and installs all skills.

### Webhook Integration

Extend `hook-handlers.ts` to add custom behavior:

```typescript
hooks: {
  TaskCompleted: async (event) => {
    // Default: broadcast to UI
    defaultHandler(event);

    // Custom: Send Slack notification
    await fetch('https://hooks.slack.com/...', {
      method: 'POST',
      body: JSON.stringify({
        text: `Task completed: ${event.taskSubject}`
      })
    });
  }
}
```

## Troubleshooting

### Session Stuck in "starting"

**Cause**: CLI process failed to launch or crashed immediately.

**Solution**:
1. Check server logs for spawn errors
2. Verify `ANTHROPIC_API_KEY` or `claude login` authentication
3. Ensure `cwd` path exists and is accessible

### Teammates Not Discovered

**Cause**: Lead agent didn't use `Task` tool with correct parameters.

**Solution**:
1. Verify Teammate Specs are included in session creation
2. Check Lead's output for task delegation attempts
3. Ensure `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` env var is set

### Permission Requests Not Showing

**Cause**: WebSocket connection dropped or permission rule auto-approved.

**Solution**:
1. Check browser DevTools Network tab for WebSocket status
2. Review permission rules - may have wildcard auto-allow
3. Verify `permissionMode` is not set to `bypassPermissions`

### High Cost/Token Usage

**Cause**: Inefficient prompts, large file attachments, or runaway loops.

**Solution**:
1. Set `maxBudgetUsd` to enforce hard limits
2. Compress images before uploading
3. Use more specific task descriptions to reduce trial-and-error
4. Monitor cost in real-time via CostTracker component
