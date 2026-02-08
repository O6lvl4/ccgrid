// ---- Teammate spec (user-defined before session start) ----
export interface TeammateSpec {
  id: string;
  name: string;
  role: string;
  instructions?: string;
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
  | { type: 'snapshot'; sessions: Session[]; teammates: Teammate[]; tasks: TeamTask[]; leadOutputs: Record<string, string>; teammateSpecs: TeammateSpec[] };

// ---- WebSocket: Client → Server ----
export type ClientMessage =
  | { type: 'permission_response'; requestId: string; behavior: 'allow' | 'deny'; message?: string };
