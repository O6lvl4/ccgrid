# ccgrid API Reference

Complete reference for ccgrid's REST API and WebSocket protocol.

## Table of Contents

- [REST API](#rest-api)
  - [Sessions](#sessions)
  - [Teammates](#teammates)
  - [Tasks](#tasks)
  - [Teammate Specs](#teammate-specs)
  - [Skill Specs](#skill-specs)
  - [Plugins](#plugins)
  - [Permission Rules](#permission-rules)
  - [Permissions Log](#permissions-log)
  - [Usage](#usage)
  - [Directories](#directories)
  - [Health](#health)
- [WebSocket Protocol](#websocket-protocol)
  - [Connection](#connection)
  - [Server → Client Messages](#server--client-messages)
  - [Client → Server Messages](#client--server-messages)
- [Type Definitions](#type-definitions)

## REST API

Base URL: `http://localhost:7819`

### Sessions

#### Create Session

Create a new session and launch a Lead agent.

```http
POST /api/sessions
Content-Type: application/json

{
  "name": "Project Alpha",
  "cwd": "/Users/username/projects/alpha",
  "model": "claude-sonnet-4-5-20250929",
  "taskDescription": "Refactor authentication module to use OAuth 2.0",
  "teammateSpecs": [
    {
      "id": "spec-1",
      "name": "researcher",
      "role": "Research specialist",
      "instructions": "Focus on finding best practices and security considerations",
      "skillIds": ["skill-1", "skill-2"]
    }
  ],
  "maxBudgetUsd": 5.0,
  "permissionMode": "acceptEdits",
  "customInstructions": "Follow company coding standards in CONTRIBUTING.md",
  "files": [
    {
      "name": "requirements.pdf",
      "mimeType": "application/pdf",
      "base64Data": "JVBERi0xLj..."
    }
  ]
}
```

**Response** (201 Created):

```json
{
  "id": "abc-123",
  "name": "Project Alpha",
  "cwd": "/Users/username/projects/alpha",
  "model": "claude-sonnet-4-5-20250929",
  "taskDescription": "Refactor authentication module to use OAuth 2.0",
  "status": "starting",
  "permissionMode": "acceptEdits",
  "costUsd": 0,
  "inputTokens": 0,
  "outputTokens": 0,
  "createdAt": "2025-02-15T10:30:00.000Z",
  "teammateSpecs": [...],
  "maxBudgetUsd": 5.0,
  "customInstructions": "..."
}
```

**Request Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable session name |
| `cwd` | string | Yes | Working directory path |
| `model` | string | Yes | Claude model ID (e.g., `claude-sonnet-4-5-20250929`) |
| `taskDescription` | string | Yes | Task for the Lead agent |
| `teammateSpecs` | TeammateSpec[] | No | Teammate configurations |
| `maxBudgetUsd` | number | No | Cost limit in USD |
| `permissionMode` | string | No | `"acceptEdits"` (default) or `"bypassPermissions"` |
| `customInstructions` | string | No | Additional prompt instructions |
| `files` | FileAttachment[] | No | Attached files (images, PDFs, text) |

#### List Sessions

Get all sessions.

```http
GET /api/sessions
```

**Response** (200 OK):

```json
[
  {
    "id": "abc-123",
    "name": "Project Alpha",
    "status": "running",
    "costUsd": 0.42,
    "createdAt": "2025-02-15T10:30:00.000Z",
    ...
  },
  {
    "id": "def-456",
    "name": "Bug Fix",
    "status": "completed",
    "costUsd": 0.15,
    "createdAt": "2025-02-15T09:00:00.000Z",
    ...
  }
]
```

#### Get Session

Get a single session by ID.

```http
GET /api/sessions/:id
```

**Response** (200 OK):

```json
{
  "id": "abc-123",
  "name": "Project Alpha",
  "cwd": "/Users/username/projects/alpha",
  "model": "claude-sonnet-4-5-20250929",
  "status": "running",
  "sessionId": "sdk-session-xyz",
  "costUsd": 0.42,
  "inputTokens": 12500,
  "outputTokens": 3200,
  "createdAt": "2025-02-15T10:30:00.000Z",
  ...
}
```

**Errors**:

- `404 Not Found` - Session does not exist

#### Update Session

Update session metadata.

```http
PATCH /api/sessions/:id
Content-Type: application/json

{
  "name": "Project Alpha (Updated)"
}
```

**Response** (200 OK):

```json
{
  "id": "abc-123",
  "name": "Project Alpha (Updated)",
  ...
}
```

**Errors**:

- `404 Not Found` - Session does not exist

#### Delete Session

Stop and delete a session.

```http
DELETE /api/sessions/:id
```

**Response**: `204 No Content`

**Behavior**:

1. Stop the session if running
2. Delete session state from memory
3. Delete session file from `~/.ccgrid/sessions/`
4. Broadcast `session_deleted` via WebSocket

#### Stop Session

Stop a running session without deleting it.

```http
POST /api/sessions/:id/stop
```

**Response** (200 OK):

```json
{
  "id": "abc-123",
  "status": "completed",
  ...
}
```

**Behavior**:

1. Send interrupt to Agent SDK
2. Abort CLI subprocess
3. Update session status to `completed`
4. Stop all Teammate transcript pollers

**Errors**:

- `404 Not Found` - Session does not exist

#### Continue Session

Add a follow-up prompt to a completed session.

```http
POST /api/sessions/:id/continue
Content-Type: application/json

{
  "prompt": "Now add unit tests for the authentication module",
  "files": [
    {
      "name": "test-plan.md",
      "mimeType": "text/plain",
      "base64Data": "IyBUZXN0..."
    }
  ]
}
```

**Response** (200 OK):

```json
{
  "id": "abc-123",
  "status": "starting",
  ...
}
```

**Behavior**:

1. Verify session status is `completed`
2. Save attached files to temp directory
3. Resume session with new prompt via SDK `resume` option
4. Update session status to `starting` → `running`

**Errors**:

- `404 Not Found` - Session does not exist or not in `completed` status
- `400 Bad Request` - Missing `prompt` field

#### Send Message to Teammate

Send a direct message to a specific Teammate.

```http
POST /api/sessions/:id/teammates/:name/message
Content-Type: application/json

{
  "message": "What's the status of task #3?"
}
```

**Parameters**:

- `:id` - Session ID
- `:name` - Teammate name (e.g., `researcher`, `tester`)

**Response** (200 OK):

```json
{
  "id": "abc-123",
  "status": "running",
  ...
}
```

**Behavior**:

1. Find Teammate by name within session
2. Write message to Teammate's input queue
3. Broadcast `teammate_message_relayed` via WebSocket

**Errors**:

- `404 Not Found` - Session or Teammate not found
- `400 Bad Request` - Missing `message` field

### Teammates

#### List Teammates

Get all Teammates for a session.

```http
GET /api/sessions/:id/teammates
```

**Response** (200 OK):

```json
[
  {
    "agentId": "xyz-456",
    "sessionId": "abc-123",
    "name": "researcher",
    "agentType": "researcher",
    "status": "working",
    "transcriptPath": "/Users/username/.claude/sessions/xyz-456/transcript.jsonl",
    "output": "I've analyzed the OAuth 2.0 specification..."
  },
  {
    "agentId": "xyz-789",
    "sessionId": "abc-123",
    "name": "tester",
    "agentType": "tester",
    "status": "idle",
    "transcriptPath": "...",
    "output": "Waiting for implementation to complete..."
  }
]
```

**Errors**:

- `404 Not Found` - Session does not exist

#### Get Teammate

Get a specific Teammate by agent ID.

```http
GET /api/sessions/:id/teammates/:agentId
```

**Response** (200 OK):

```json
{
  "agentId": "xyz-456",
  "sessionId": "abc-123",
  "name": "researcher",
  "agentType": "researcher",
  "status": "working",
  "transcriptPath": "/Users/username/.claude/sessions/xyz-456/transcript.jsonl",
  "output": "I've analyzed the OAuth 2.0 specification and identified three key security considerations:\n\n1. Token storage..."
}
```

**Errors**:

- `404 Not Found` - Teammate not found or does not belong to session

### Tasks

#### List Tasks

Get all tasks for a session.

```http
GET /api/sessions/:id/tasks
```

**Response** (200 OK):

```json
[
  {
    "id": "1",
    "subject": "Research OAuth 2.0 best practices",
    "description": "Investigate security considerations and implementation patterns",
    "status": "completed",
    "assignedAgentId": "xyz-456",
    "blocks": ["2"],
    "blockedBy": []
  },
  {
    "id": "2",
    "subject": "Implement OAuth 2.0 provider integration",
    "description": "Integrate with Auth0 as the OAuth provider",
    "status": "in_progress",
    "assignedAgentId": "xyz-789",
    "blocks": ["3"],
    "blockedBy": ["1"]
  },
  {
    "id": "3",
    "subject": "Write integration tests",
    "status": "pending",
    "assignedAgentId": null,
    "blocks": [],
    "blockedBy": ["2"]
  }
]
```

**Task Status Values**:

- `pending` - Not started
- `in_progress` - Currently being worked on
- `completed` - Finished

**Errors**:

- `404 Not Found` - Session does not exist

### Teammate Specs

Teammate Specs are reusable templates for creating Teammates.

#### List Teammate Specs

```http
GET /api/teammate-specs
```

**Response** (200 OK):

```json
[
  {
    "id": "spec-1",
    "name": "researcher",
    "role": "Research specialist",
    "instructions": "Focus on gathering comprehensive information and documenting findings.",
    "skillIds": ["skill-web-search", "skill-pdf-reader"],
    "createdAt": "2025-02-15T08:00:00.000Z"
  },
  {
    "id": "spec-2",
    "name": "tester",
    "role": "QA specialist",
    "instructions": "Write comprehensive tests and verify functionality.",
    "skillIds": ["skill-test-runner"],
    "createdAt": "2025-02-15T08:00:00.000Z"
  }
]
```

#### Create Teammate Spec

```http
POST /api/teammate-specs
Content-Type: application/json

{
  "name": "security-auditor",
  "role": "Security specialist",
  "instructions": "Analyze code for security vulnerabilities and recommend fixes.",
  "skillIds": ["skill-1", "skill-2"]
}
```

**Response** (201 Created):

```json
{
  "id": "spec-3",
  "name": "security-auditor",
  "role": "Security specialist",
  "instructions": "Analyze code for security vulnerabilities and recommend fixes.",
  "skillIds": ["skill-1", "skill-2"],
  "createdAt": "2025-02-15T10:45:00.000Z"
}
```

#### Update Teammate Spec

```http
PATCH /api/teammate-specs/:id
Content-Type: application/json

{
  "instructions": "Analyze code for security vulnerabilities, focusing on OWASP Top 10.",
  "skillIds": ["skill-1", "skill-2", "skill-3"]
}
```

**Response** (200 OK):

```json
{
  "id": "spec-3",
  "name": "security-auditor",
  "role": "Security specialist",
  "instructions": "Analyze code for security vulnerabilities, focusing on OWASP Top 10.",
  "skillIds": ["skill-1", "skill-2", "skill-3"],
  "createdAt": "2025-02-15T10:45:00.000Z"
}
```

**Errors**:

- `404 Not Found` - Spec does not exist

#### Delete Teammate Spec

```http
DELETE /api/teammate-specs/:id
```

**Response**: `204 No Content`

**Errors**:

- `404 Not Found` - Spec does not exist

### Skill Specs

Skills are capabilities that can be assigned to Lead or Teammates.

#### List Skill Specs

```http
GET /api/skill-specs
```

**Response** (200 OK):

```json
[
  {
    "id": "skill-1",
    "name": "web-search",
    "description": "Search the web for information",
    "skillType": "official",
    "createdAt": "2025-02-15T08:00:00.000Z"
  },
  {
    "id": "skill-2",
    "name": "pdf-reader",
    "description": "Read and extract text from PDF files",
    "skillType": "external",
    "pluginName": "document-tools",
    "skillMdContent": "# PDF Reader\n\n...",
    "allowedTools": "Read,Bash",
    "argumentHint": "file_path:string",
    "createdAt": "2025-02-15T09:00:00.000Z"
  },
  {
    "id": "skill-3",
    "name": "custom-linter",
    "description": "Run custom linting rules",
    "skillType": "internal",
    "skillMdContent": "# Custom Linter\n\nExecute ESLint with custom config...",
    "allowedTools": "Bash",
    "createdAt": "2025-02-15T10:00:00.000Z"
  }
]
```

**Skill Types**:

- `official` - Built-in Claude skills
- `external` - Installed from plugin repositories
- `internal` - User-defined custom skills

#### Create Skill Spec

```http
POST /api/skill-specs
Content-Type: application/json

{
  "name": "database-query",
  "description": "Execute SQL queries against PostgreSQL",
  "skillType": "internal",
  "skillMdContent": "# Database Query\n\nConnect to PostgreSQL and execute SQL queries...",
  "allowedTools": "Bash,Read",
  "argumentHint": "query:string"
}
```

**Response** (201 Created):

```json
{
  "id": "skill-4",
  "name": "database-query",
  "description": "Execute SQL queries against PostgreSQL",
  "skillType": "internal",
  "skillMdContent": "# Database Query\n\n...",
  "allowedTools": "Bash,Read",
  "argumentHint": "query:string",
  "createdAt": "2025-02-15T10:50:00.000Z"
}
```

**Request Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Skill identifier |
| `description` | string | Yes | Brief description |
| `skillType` | string | Yes | `official`, `external`, or `internal` |
| `skillMdContent` | string | Conditional | Markdown documentation (required for `internal` skills) |
| `allowedTools` | string | No | Comma-separated tool names (e.g., `"Bash,Read,Write"`) |
| `argumentHint` | string | No | Parameter format hint (e.g., `"file_path:string, mode:number"`) |

#### Delete Skill Spec

```http
DELETE /api/skill-specs/:id
```

**Response**: `204 No Content`

**Errors**:

- `404 Not Found` - Skill does not exist
- `409 Conflict` - Skill is used by Teammate Specs (delete references first)

### Plugins

Plugins are collections of skills installed from GitHub repositories.

#### List Plugins

```http
GET /api/plugins
```

**Response** (200 OK):

```json
[
  {
    "name": "document-tools",
    "description": "PDF and document processing utilities",
    "version": "1.2.0",
    "author": "username",
    "repository": "https://github.com/username/ccgrid-plugin-document-tools",
    "source": "username/ccgrid-plugin-document-tools",
    "skillIds": ["skill-2", "skill-5"],
    "installedAt": "2025-02-15T09:00:00.000Z"
  }
]
```

#### Install Plugin

Install a plugin from a GitHub repository.

```http
POST /api/plugins/install
Content-Type: application/json

{
  "source": "username/repo-name",
  "alias": "my-tools"
}
```

**Request Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | string | Yes | GitHub repository in format `owner/repo` |
| `alias` | string | No | Custom name for the plugin (defaults to repo name) |

**Response** (201 Created):

```json
{
  "name": "my-tools",
  "description": "Collection of utility tools",
  "version": "2.0.1",
  "author": "username",
  "repository": "https://github.com/username/repo-name",
  "source": "username/repo-name",
  "skillIds": ["skill-6", "skill-7", "skill-8"],
  "installedAt": "2025-02-15T11:00:00.000Z"
}
```

**Installation Process**:

1. Fetch `ccgrid-plugin.json` from GitHub repo's main branch
2. Parse plugin metadata
3. Create Skill Specs for each skill in the plugin
4. Save plugin record to `~/.ccgrid/plugins.json`

**ccgrid-plugin.json Format**:

```json
{
  "name": "my-tools",
  "version": "2.0.1",
  "description": "Collection of utility tools",
  "author": "username",
  "repository": "https://github.com/username/repo-name",
  "skills": [
    {
      "name": "tool-1",
      "description": "First utility tool",
      "skillMdPath": "skills/tool-1.md",
      "allowedTools": "Bash",
      "argumentHint": "input:string"
    },
    {
      "name": "tool-2",
      "description": "Second utility tool",
      "skillMdPath": "skills/tool-2.md"
    }
  ]
}
```

**Errors**:

- `400 Bad Request` - Invalid source format or plugin already installed
- `404 Not Found` - Repository or `ccgrid-plugin.json` not found
- `500 Internal Server Error` - Network error or invalid plugin format

#### Delete Plugin

Uninstall a plugin and remove all its skills.

```http
DELETE /api/plugins/:name
```

**Response**: `204 No Content`

**Behavior**:

1. Delete all skill specs associated with the plugin
2. Remove plugin record from `~/.ccgrid/plugins.json`
3. Broadcast `permission_rules_updated` if any rules referenced deleted skills

**Errors**:

- `404 Not Found` - Plugin does not exist

### Permission Rules

Rules for automatic approval/denial of tool executions.

#### List Permission Rules

```http
GET /api/permission-rules
```

**Response** (200 OK):

```json
[
  {
    "id": "rule-1",
    "toolName": "Read",
    "pathPattern": "**/*.md",
    "behavior": "allow",
    "createdAt": "2025-02-15T08:00:00.000Z"
  },
  {
    "id": "rule-2",
    "toolName": "Write",
    "pathPattern": "/etc/**",
    "behavior": "deny",
    "createdAt": "2025-02-15T08:00:00.000Z"
  },
  {
    "id": "rule-3",
    "toolName": "*",
    "behavior": "allow",
    "createdAt": "2025-02-15T08:00:00.000Z"
  }
]
```

**Rule Matching Logic**:

1. Match `toolName` (`*` matches all tools)
2. If `pathPattern` specified, extract file path from tool input and check match
3. If both match, apply `behavior`

**Path Pattern Examples**:

- `**/*.test.ts` - All test files
- `/tmp/**` - Anything in /tmp
- `/Users/username/projects/**` - Project directory
- `**/node_modules/**` - node_modules anywhere

#### Create Permission Rule

```http
POST /api/permission-rules
Content-Type: application/json

{
  "toolName": "Bash",
  "pathPattern": "**",
  "behavior": "allow"
}
```

**Response** (201 Created):

```json
{
  "id": "rule-4",
  "toolName": "Bash",
  "pathPattern": "**",
  "behavior": "allow",
  "createdAt": "2025-02-15T11:05:00.000Z"
}
```

**Request Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `toolName` | string | Yes | Tool name or `*` for wildcard |
| `pathPattern` | string | No | Glob pattern for path matching |
| `behavior` | string | Yes | `allow` or `deny` |

**Behavior**:

- Rules are evaluated in order of creation (first match wins)
- Broadcast `permission_rules_updated` via WebSocket

#### Delete Permission Rule

```http
DELETE /api/permission-rules/:id
```

**Response**: `204 No Content`

**Behavior**:

- Broadcast `permission_rules_updated` via WebSocket

**Errors**:

- `404 Not Found` - Rule does not exist

### Permissions Log

#### Get Permission Log

Get all permission decisions for a session.

```http
GET /api/sessions/:id/permissions
```

**Response** (200 OK):

```json
[
  {
    "requestId": "req-123",
    "sessionId": "abc-123",
    "toolName": "Write",
    "input": {
      "file_path": "/src/auth.ts",
      "content": "export class AuthProvider { ... }"
    },
    "description": "Create new authentication provider class",
    "agentId": "lead",
    "behavior": "allow",
    "timestamp": "2025-02-15T10:35:12.000Z"
  },
  {
    "requestId": "auto-1644926115000",
    "sessionId": "abc-123",
    "toolName": "Read",
    "input": {
      "file_path": "/README.md"
    },
    "agentId": "xyz-456",
    "behavior": "auto",
    "rule": "Read (**/*.md): allow",
    "timestamp": "2025-02-15T10:35:15.000Z"
  }
]
```

**Behavior Values**:

- `allow` - User approved
- `deny` - User denied
- `auto` - Auto-decided by rule

**Errors**:

- `404 Not Found` - Session does not exist

### Usage

#### Get API Usage

Retrieve Claude API usage statistics via `ccusage` command.

```http
GET /api/usage
```

**Response** (200 OK):

```json
{
  "plan": "Claude Pro",
  "usage": {
    "used": 42500000,
    "limit": 100000000,
    "percentage": 42.5
  },
  "resetDate": "2025-03-01T00:00:00.000Z"
}
```

**Behavior**:

- Executes `ccusage` CLI command
- Parses output for usage metrics
- Returns `null` if `ccusage` not installed

**Errors**:

- `500 Internal Server Error` - `ccusage` command failed

### Directories

#### List Directories

List directories in a given path.

```http
GET /api/dirs?path=/Users/username/projects
```

**Response** (200 OK):

```json
{
  "directories": [
    "/Users/username/projects/project-a",
    "/Users/username/projects/project-b",
    "/Users/username/projects/project-c"
  ]
}
```

**Query Parameters**:

- `path` - Directory path to list (defaults to home directory)

**Errors**:

- `400 Bad Request` - Invalid path
- `403 Forbidden` - Permission denied

#### Validate Directory

Check if a path is a valid, accessible directory.

```http
GET /api/dirs/validate?path=/Users/username/projects/alpha
```

**Response** (200 OK):

```json
{
  "valid": true
}
```

**Response** (200 OK - Invalid):

```json
{
  "valid": false,
  "error": "Path does not exist"
}
```

**Query Parameters**:

- `path` - Directory path to validate

### Health

#### Health Check

Verify server is running.

```http
GET /api/health
```

**Response** (200 OK):

```json
{
  "status": "ok",
  "timestamp": "2025-02-15T11:10:00.000Z"
}
```

## WebSocket Protocol

### Connection

**Endpoint**: `ws://localhost:7819`

**Example** (JavaScript):

```javascript
const ws = new WebSocket('ws://localhost:7819');

ws.onopen = () => {
  console.log('Connected to ccgrid server');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from server');
};
```

**Initial Snapshot**:

Upon connection, the server immediately sends a `snapshot` message containing the full current state.

### Server → Client Messages

#### snapshot

Complete state snapshot sent on connection.

```json
{
  "type": "snapshot",
  "sessions": [...],
  "teammates": [...],
  "tasks": {
    "abc-123": [...]
  },
  "leadOutputs": {
    "abc-123": "..."
  },
  "teammateSpecs": [...],
  "skillSpecs": [...],
  "plugins": [...],
  "permissionRules": [...]
}
```

#### session_created

New session created.

```json
{
  "type": "session_created",
  "session": {
    "id": "abc-123",
    "name": "Project Alpha",
    "status": "starting",
    ...
  }
}
```

#### session_status

Session status changed.

```json
{
  "type": "session_status",
  "sessionId": "abc-123",
  "status": "running"
}
```

**Status Values**: `starting`, `running`, `completed`, `error`

#### session_deleted

Session deleted.

```json
{
  "type": "session_deleted",
  "sessionId": "abc-123"
}
```

#### lead_output

Incremental Lead agent output.

```json
{
  "type": "lead_output",
  "sessionId": "abc-123",
  "text": "I'll analyze the authentication module and create a refactoring plan...\n"
}
```

**Behavior**: Append `text` to existing Lead output.

#### teammate_discovered

New Teammate discovered.

```json
{
  "type": "teammate_discovered",
  "sessionId": "abc-123",
  "teammate": {
    "agentId": "xyz-456",
    "sessionId": "abc-123",
    "name": "researcher",
    "agentType": "researcher",
    "status": "starting",
    "transcriptPath": "..."
  }
}
```

#### teammate_status

Teammate status changed.

```json
{
  "type": "teammate_status",
  "sessionId": "abc-123",
  "agentId": "xyz-456",
  "status": "working",
  "name": "researcher"
}
```

**Status Values**: `starting`, `working`, `idle`, `stopped`

#### teammate_output

Incremental Teammate output.

```json
{
  "type": "teammate_output",
  "sessionId": "abc-123",
  "agentId": "xyz-456",
  "text": "I've researched OAuth 2.0 and found three key implementation patterns...\n"
}
```

**Behavior**: Append `text` to existing Teammate output.

#### task_sync

Task list synchronized.

```json
{
  "type": "task_sync",
  "sessionId": "abc-123",
  "tasks": [
    {
      "id": "1",
      "subject": "Research OAuth 2.0",
      "status": "completed",
      ...
    },
    {
      "id": "2",
      "subject": "Implement provider integration",
      "status": "in_progress",
      ...
    }
  ]
}
```

**Behavior**: Replace entire task list for session.

#### task_completed

Task marked as completed.

```json
{
  "type": "task_completed",
  "sessionId": "abc-123",
  "taskId": "1",
  "taskSubject": "Research OAuth 2.0",
  "teammateName": "researcher"
}
```

#### cost_update

Session cost updated.

```json
{
  "type": "cost_update",
  "sessionId": "abc-123",
  "costUsd": 0.42,
  "inputTokens": 12500,
  "outputTokens": 3200
}
```

#### permission_request

Agent requesting permission to execute a tool.

```json
{
  "type": "permission_request",
  "sessionId": "abc-123",
  "requestId": "req-456",
  "toolName": "Write",
  "input": {
    "file_path": "/src/auth.ts",
    "content": "export class AuthProvider { ... }"
  },
  "description": "Create new authentication provider class",
  "agentId": "lead"
}
```

**Expected Response**: Client must send `permission_response` message.

#### permission_resolved

Permission decision logged.

```json
{
  "type": "permission_resolved",
  "entry": {
    "requestId": "req-456",
    "sessionId": "abc-123",
    "toolName": "Write",
    "input": { ... },
    "behavior": "allow",
    "timestamp": "2025-02-15T10:35:12.000Z"
  }
}
```

#### permission_rules_updated

Permission rules changed.

```json
{
  "type": "permission_rules_updated",
  "rules": [
    {
      "id": "rule-1",
      "toolName": "Read",
      "pathPattern": "**/*.md",
      "behavior": "allow",
      "createdAt": "..."
    },
    ...
  ]
}
```

#### teammate_message_relayed

Message sent to Teammate.

```json
{
  "type": "teammate_message_relayed",
  "sessionId": "abc-123",
  "teammateName": "researcher",
  "message": "What's the status of task #3?"
}
```

#### error

Error occurred.

```json
{
  "type": "error",
  "message": "Failed to spawn CLI process",
  "sessionId": "abc-123"
}
```

### Client → Server Messages

#### permission_response

Respond to a permission request.

```json
{
  "type": "permission_response",
  "requestId": "req-456",
  "behavior": "allow",
  "updatedInput": {
    "file_path": "/src/auth.ts",
    "content": "export class AuthProvider { /* modified */ }"
  }
}
```

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requestId` | string | Yes | ID from `permission_request` message |
| `behavior` | string | Yes | `allow` or `deny` |
| `message` | string | No | Denial reason (if `behavior` is `deny`) |
| `updatedInput` | object | No | Modified tool input (if allowing with changes) |

#### teammate_message

Send message to a Teammate.

```json
{
  "type": "teammate_message",
  "sessionId": "abc-123",
  "teammateName": "researcher",
  "message": "Please focus on security considerations for token storage"
}
```

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID |
| `teammateName` | string | Yes | Teammate name |
| `message` | string | Yes | Message content |

## Type Definitions

### Session

```typescript
interface Session {
  id: string;
  name: string;
  cwd: string;
  model: string;
  taskDescription: string;
  maxBudgetUsd?: number;
  teammateSpecs?: TeammateSpec[];
  status: 'starting' | 'running' | 'completed' | 'error';
  sessionId?: string; // SDK session ID
  permissionMode?: 'acceptEdits' | 'bypassPermissions';
  customInstructions?: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  createdAt: string; // ISO 8601
}
```

### Teammate

```typescript
interface Teammate {
  agentId: string;
  sessionId: string;
  name?: string;
  agentType: string;
  status: 'starting' | 'working' | 'idle' | 'stopped';
  transcriptPath?: string;
  output?: string;
}
```

### TeamTask

```typescript
interface TeamTask {
  id: string;
  subject: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedAgentId?: string;
  blocks: string[];      // Task IDs this task blocks
  blockedBy: string[];   // Task IDs blocking this task
}
```

### TeammateSpec

```typescript
interface TeammateSpec {
  id: string;
  name: string;
  role: string;
  instructions?: string;
  skillIds?: string[];
  createdAt: string;
}
```

### SkillSpec

```typescript
interface SkillSpec {
  id: string;
  name: string;
  description: string;
  skillType: 'official' | 'external' | 'internal';
  createdAt: string;
  pluginName?: string;          // For external skills
  skillMdContent?: string;      // For internal/external skills
  allowedTools?: string;        // Comma-separated
  argumentHint?: string;        // Parameter format hint
}
```

### PluginSpec

```typescript
interface PluginSpec {
  name: string;
  description: string;
  version: string;
  author: string;
  repository: string;
  source: string;               // owner/repo
  alias?: string;
  skillIds: string[];
  installedAt: string;
}
```

### PermissionRule

```typescript
interface PermissionRule {
  id: string;
  toolName: string;
  pathPattern?: string;
  behavior: 'allow' | 'deny';
  createdAt: string;
}
```

### PermissionLogEntry

```typescript
interface PermissionLogEntry {
  requestId: string;
  sessionId: string;
  toolName: string;
  input: Record<string, unknown>;
  description?: string;
  agentId?: string;
  behavior: 'allow' | 'deny' | 'auto';
  rule?: string;                // Rule description (for auto decisions)
  timestamp: string;
}
```

### FileAttachment

```typescript
interface FileAttachment {
  name: string;
  mimeType: string;
  base64Data: string;
}
```

## Error Handling

### HTTP Errors

All endpoints return standard HTTP status codes:

- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success with no response body
- `400 Bad Request` - Invalid request parameters
- `403 Forbidden` - Permission denied
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate)
- `500 Internal Server Error` - Server error

**Error Response Format**:

```json
{
  "error": "Detailed error message"
}
```

### WebSocket Errors

WebSocket errors are sent as `error` messages:

```json
{
  "type": "error",
  "message": "Failed to process permission response: invalid requestId",
  "sessionId": "abc-123"
}
```

**Common WebSocket Errors**:

- Invalid message format (not JSON)
- Unknown message type
- Missing required fields
- Invalid session/request IDs
- Permission response timeout

## Rate Limiting

Currently, ccgrid does not implement rate limiting. All endpoints and WebSocket connections are unlimited.

For production deployments, consider implementing:

- Per-IP connection limits
- Session creation rate limits
- WebSocket message throttling

## Authentication

ccgrid does not currently implement user authentication. The server assumes trusted local network access.

For production deployments with remote access, implement:

- API key authentication
- OAuth 2.0 / JWT tokens
- Session-based authentication
- WebSocket authentication via query parameters or headers
