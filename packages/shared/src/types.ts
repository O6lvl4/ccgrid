// ---- Skill spec (reusable skill definition) ----
export type SkillType = 'official' | 'external' | 'internal';

export interface SkillSpec {
  id: string;
  name: string;
  description: string;
  skillType: SkillType;
  createdAt: string;
  pluginName?: string;
  skillMdContent?: string;
  allowedTools?: string;
  argumentHint?: string;
}

// ---- Plugin spec (installed from GitHub) ----
export interface PluginSpec {
  name: string;
  description: string;
  version: string;
  author: string;
  repository: string;
  source: string; // owner/repo
  alias?: string;
  skillIds: string[];
  installedAt: string;
}

// ---- Teammate spec (user-defined before session start) ----
export interface TeammateSpec {
  id: string;
  name: string;
  role: string;
  instructions?: string;
  skillIds?: string[];
  createdAt: string;
}

// ---- Session (= 1 Lead Agent + Agent Teams) ----
export interface Session {
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
  createdAt: string;
}

// ---- Teammate (discovered via hooks) ----
export type TeammateStatus = 'starting' | 'working' | 'idle' | 'stopped';

export interface Teammate {
  agentId: string;
  sessionId: string;
  name?: string;
  agentType: string;
  status: TeammateStatus;
  transcriptPath?: string;
  output?: string;
}

// ---- Task (from ~/.claude/tasks/{sessionId}/) ----
export interface TeamTask {
  id: string;
  subject: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedAgentId?: string;
  blocks: string[];
  blockedBy: string[];
}

// ---- Permission log entry ----
export interface PermissionLogEntry {
  requestId: string;
  sessionId: string;
  toolName: string;
  input: Record<string, unknown>;
  description?: string;
  agentId?: string;
  behavior: 'allow' | 'deny' | 'auto';
  rule?: string;
  timestamp: string;
}

// ---- File attachment ----
export interface FileAttachment {
  name: string;
  mimeType: string;
  base64Data: string;
}

// ---- Permission rule (auto-judgment) ----
export interface PermissionRule {
  id: string;
  toolName: string;
  pathPattern?: string;
  behavior: 'allow' | 'deny';
  createdAt: string;
}

// ---- WebSocket: Server → Client ----
export type ServerMessage =
  | { type: 'session_created'; session: Session }
  | { type: 'session_status'; sessionId: string; status: Session['status'] }
  | { type: 'session_deleted'; sessionId: string }
  | { type: 'lead_output'; sessionId: string; text: string }
  | { type: 'teammate_discovered'; sessionId: string; teammate: Teammate }
  | { type: 'teammate_status'; sessionId: string; agentId: string; status: TeammateStatus; name?: string }
  | { type: 'teammate_output'; sessionId: string; agentId: string; text: string }
  | { type: 'task_sync'; sessionId: string; tasks: TeamTask[] }
  | { type: 'task_completed'; sessionId: string; taskId: string; taskSubject: string; teammateName?: string }
  | { type: 'cost_update'; sessionId: string; costUsd: number; inputTokens: number; outputTokens: number }
  | { type: 'error'; message: string; sessionId?: string }
  | { type: 'permission_request'; sessionId: string; requestId: string; toolName: string; input: Record<string, unknown>; description?: string; agentId?: string }
  | { type: 'teammate_message_relayed'; sessionId: string; teammateName: string; message: string }
  | { type: 'permission_resolved'; entry: PermissionLogEntry }
  | { type: 'permission_rules_updated'; rules: PermissionRule[] }
  | { type: 'snapshot'; sessions: Session[]; teammates: Teammate[]; tasks: Record<string, TeamTask[]>; leadOutputs: Record<string, string>; teammateSpecs: TeammateSpec[]; skillSpecs: SkillSpec[]; plugins: PluginSpec[]; permissionRules: PermissionRule[] };

// ---- WebSocket: Client → Server ----
export type ClientMessage =
  | { type: 'permission_response'; requestId: string; behavior: 'allow' | 'deny'; message?: string; updatedInput?: Record<string, unknown> }
  | { type: 'teammate_message'; sessionId: string; teammateName: string; message: string };
