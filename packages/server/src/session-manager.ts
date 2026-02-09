import { query, type Query, type CanUseTool } from '@anthropic-ai/claude-agent-sdk';
import { v4 as uuidv4 } from 'uuid';
import type { Session, Teammate, TeamTask, TeammateSpec, ServerMessage } from '@ccgrid/shared';
import { loadAllSessions, saveSession, deleteSessionFile } from './state-store.js';
import { buildPrompt, buildSystemPrompt } from './prompt-builder.js';
import { processLeadStream } from './lead-stream.js';
import { createHookHandlers } from './hook-handlers.js';
import { startTaskWatcher, syncTasks } from './task-watcher.js';
import { loadTeammateOutputs, readTeammateTranscript } from './transcript-reader.js';
import { startPolling as startTranscriptPolling, stopPolling as stopTranscriptPolling, stopAllPolling, type PollerDeps } from './transcript-poller.js';

interface ActiveSession {
  query: Query;
  abortController: AbortController;
}

export class SessionManager {
  private sessions: Map<string, Session>;
  private activeSessions = new Map<string, ActiveSession>();
  private teammates: Map<string, Teammate>;
  private tasks: Map<string, TeamTask[]>;
  private leadOutputs: Map<string, string>;
  private broadcast: (msg: ServerMessage) => void;
  private persistTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingPermissions = new Map<string, {
    resolve: (result: { behavior: 'allow'; updatedInput?: Record<string, unknown> } | { behavior: 'deny'; message: string }) => void;
  }>();
  private pendingPermissionInputs = new Map<string, Record<string, unknown>>();

  constructor(broadcast: (msg: ServerMessage) => void) {
    this.broadcast = broadcast;
    const restored = loadAllSessions();
    this.sessions = restored.sessions;
    this.teammates = restored.teammates;
    this.tasks = restored.tasks;
    this.leadOutputs = restored.leadOutputs;

    for (const session of this.sessions.values()) {
      if (session.status === 'starting' || session.status === 'running') {
        session.status = 'completed';
        this.persistSession(session.id);
      }
    }

    // Recover missing teammate outputs from transcript files
    this.recoverTeammateOutputs();
  }

  private async recoverTeammateOutputs(): Promise<void> {
    const sessionsToSave = new Set<string>();

    for (const teammate of this.teammates.values()) {
      if (teammate.output) continue;

      const session = this.sessions.get(teammate.sessionId);
      if (!session?.sessionId) continue;

      const output = await readTeammateTranscript(session.cwd, session.sessionId, teammate.agentId);
      if (output) {
        teammate.output = output;
        sessionsToSave.add(teammate.sessionId);
        this.broadcast({
          type: 'teammate_output',
          sessionId: teammate.sessionId,
          agentId: teammate.agentId,
          text: output,
        });
      }
    }

    for (const sessionId of sessionsToSave) {
      this.persistSession(sessionId);
    }
  }

  private persistSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const teammates = Array.from(this.teammates.values()).filter(t => t.sessionId === sessionId);
    const tasks = this.tasks.get(sessionId) ?? [];
    const leadOutput = this.leadOutputs.get(sessionId) ?? '';
    saveSession(sessionId, session, teammates, tasks, leadOutput);
  }

  private persistSessionDebounced(sessionId: string): void {
    if (this.persistTimers.has(sessionId)) return;
    this.persistTimers.set(sessionId, setTimeout(() => {
      this.persistTimers.delete(sessionId);
      this.persistSession(sessionId);
    }, 3000));
  }

  // ---- Sessions CRUD ----

  async createSession(
    name: string,
    cwd: string,
    model: string,
    teammateSpecs: TeammateSpec[] | undefined,
    maxBudgetUsd: number | undefined,
    taskDescription: string,
    permissionMode?: 'acceptEdits' | 'bypassPermissions',
  ): Promise<Session> {
    const session: Session = {
      id: uuidv4(),
      name,
      cwd,
      model,
      taskDescription,
      ...(maxBudgetUsd != null ? { maxBudgetUsd } : {}),
      ...(teammateSpecs && teammateSpecs.length > 0 ? { teammateSpecs } : {}),
      permissionMode: permissionMode ?? 'acceptEdits',
      status: 'starting',
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    this.persistSession(session.id);
    this.broadcast({ type: 'session_created', session });

    this.startAgent(session, teammateSpecs, maxBudgetUsd);
    return session;
  }

  getSessions(): Session[] {
    // Auto-fix stale running/starting sessions that have no active query
    for (const session of this.sessions.values()) {
      if (
        (session.status === 'running' || session.status === 'starting') &&
        !this.activeSessions.has(session.id)
      ) {
        session.status = 'completed';
        this.persistSession(session.id);
      }
    }
    return Array.from(this.sessions.values());
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, updates: { name?: string }): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    if (updates.name != null) session.name = updates.name;
    this.persistSession(sessionId);
    this.broadcast({ type: 'session_status', sessionId, status: session.status });
    return session;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    await this.stopSession(sessionId);

    // Remove in-memory state
    this.sessions.delete(sessionId);
    this.leadOutputs.delete(sessionId);
    this.tasks.delete(sessionId);
    for (const [agentId, tm] of this.teammates) {
      if (tm.sessionId === sessionId) this.teammates.delete(agentId);
    }

    // Remove persisted file
    deleteSessionFile(sessionId);
    this.broadcast({ type: 'session_deleted', sessionId });
    return true;
  }

  async stopSession(sessionId: string): Promise<void> {
    stopAllPolling(sessionId, this.pollerDeps());
    const active = this.activeSessions.get(sessionId);
    if (active) {
      try {
        await active.query.interrupt();
      } catch {
        active.abortController.abort();
      }
      this.activeSessions.delete(sessionId);
    }
    const session = this.sessions.get(sessionId);
    if (session && (session.status === 'starting' || session.status === 'running')) {
      session.status = 'completed';
      this.persistSession(sessionId);
      this.broadcast({ type: 'session_status', sessionId, status: 'completed' });
    }
  }

  continueSession(sessionId: string, prompt: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    console.log(`[continueSession] sessionId=${sessionId} sdkSessionId=${session?.sessionId} status=${session?.status}`);
    if (!session?.sessionId || session.status !== 'completed') return undefined;

    const userBlock = `\n\n<!-- follow-up -->\n\n> ${prompt.replace(/\n/g, '\n> ')}\n\n`;
    const existing = this.leadOutputs.get(sessionId) ?? '';
    this.leadOutputs.set(sessionId, existing + userBlock);
    this.broadcast({ type: 'lead_output', sessionId, text: userBlock });

    session.status = 'running';
    this.persistSession(sessionId);
    this.broadcast({ type: 'session_status', sessionId, status: 'running' });

    this.startAgent(session, undefined, session.maxBudgetUsd, prompt);
    return session;
  }

  // ---- Permission resolution ----

  resolvePermission(requestId: string, behavior: 'allow' | 'deny', message?: string, updatedInput?: Record<string, unknown>): void {
    const pending = this.pendingPermissions.get(requestId);
    if (!pending) return;
    const originalInput = this.pendingPermissionInputs.get(requestId) ?? {};
    this.pendingPermissions.delete(requestId);
    this.pendingPermissionInputs.delete(requestId);
    if (behavior === 'allow') {
      pending.resolve({ behavior: 'allow', updatedInput: updatedInput ?? originalInput });
    } else {
      pending.resolve({ behavior: 'deny', message: message ?? 'User denied' });
    }
  }

  // ---- Teammates (read-only) ----

  getTeammates(sessionId?: string): Teammate[] {
    const all = Array.from(this.teammates.values());
    return sessionId ? all.filter(t => t.sessionId === sessionId) : all;
  }

  getTeammate(agentId: string): Teammate | undefined {
    return this.teammates.get(agentId);
  }

  // ---- Tasks (read-only) ----

  getTasks(sessionId: string): TeamTask[] {
    return this.tasks.get(sessionId) ?? [];
  }

  getAllTasks(): Record<string, TeamTask[]> {
    return Object.fromEntries(this.tasks);
  }

  // ---- Lead Output (read-only) ----

  getLeadOutput(sessionId: string): string {
    return this.leadOutputs.get(sessionId) ?? '';
  }

  getLeadOutputs(): Record<string, string> {
    return Object.fromEntries(this.leadOutputs);
  }

  // ---- Internal ----

  private startAgent(session: Session, teammateSpecs: TeammateSpec[] | undefined, maxBudgetUsd: number | undefined, resumePrompt?: string): void {
    const abortController = new AbortController();

    const hooks = createHookHandlers({
      sessionId: session.id,
      teammates: this.teammates,
      broadcast: this.broadcast,
      persistSession: (id) => this.persistSession(id),
      syncTasks: (id) => syncTasks(id, this.taskWatcherDeps()),
      startPolling: (agentId) => {
        if (session.sessionId) {
          startTranscriptPolling(session.id, agentId, session.sessionId, session.cwd, this.pollerDeps());
        }
      },
      stopPolling: (agentId) => stopTranscriptPolling(agentId),
    });

    const prompt = resumePrompt ?? buildPrompt(teammateSpecs, session.taskDescription);

    const isBypass = session.permissionMode === 'bypassPermissions';

    // canUseTool callback: send permission request to GUI and wait for response
    const canUseTool: CanUseTool = (toolName, input, options) => {
      console.log(`[canUseTool] session=${session.id.slice(0, 8)} tool=${toolName} agent=${options.agentID ?? 'lead'} toolUseID=${options.toolUseID}`);
      return new Promise((resolve) => {
        const requestId = uuidv4();
        const wrappedResolve = (result: { behavior: 'allow'; updatedInput?: Record<string, unknown> } | { behavior: 'deny'; message: string }) => {
          console.log(`[canUseTool:resolved] requestId=${requestId.slice(0, 8)} behavior=${result.behavior} tool=${toolName}`);
          resolve(result);
        };
        this.pendingPermissions.set(requestId, { resolve: wrappedResolve });
        this.pendingPermissionInputs.set(requestId, input as Record<string, unknown>);

        console.log(`[canUseTool:broadcast] requestId=${requestId.slice(0, 8)}`);
        this.broadcast({
          type: 'permission_request',
          sessionId: session.id,
          requestId,
          toolName,
          input,
          description: options.decisionReason,
          agentId: options.agentID,
        });

        if (options.signal.aborted) {
          console.log(`[canUseTool:already-aborted] requestId=${requestId.slice(0, 8)}`);
          this.pendingPermissions.delete(requestId);
          this.pendingPermissionInputs.delete(requestId);
          wrappedResolve({ behavior: 'deny', message: 'Already aborted' });
          return;
        }

        options.signal.addEventListener('abort', () => {
          console.log(`[canUseTool:abort] requestId=${requestId.slice(0, 8)} tool=${toolName}`);
          this.pendingPermissions.delete(requestId);
          this.pendingPermissionInputs.delete(requestId);
          wrappedResolve({ behavior: 'deny', message: 'Aborted' });
        });
      });
    };

    let agentQuery: Query;
    try {
      agentQuery = query({
        prompt,
        options: {
          ...(resumePrompt && session.sessionId ? { resume: session.sessionId } : {}),
          cwd: session.cwd,
          model: session.model,
          permissionMode: isBypass ? 'bypassPermissions' : 'default',
          ...(isBypass
            ? { allowDangerouslySkipPermissions: true }
            : { canUseTool }),
          includePartialMessages: true,
          maxTurns: 999999,
          ...(maxBudgetUsd != null ? { maxBudgetUsd } : {}),
          abortController,
          env: {
            ...process.env,
            CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
          },
          systemPrompt: buildSystemPrompt(),
          settingSources: ['user', 'project'],
          hooks: {
            SubagentStart: [{ hooks: [hooks.onSubagentStart] }],
            SubagentStop: [{ hooks: [hooks.onSubagentStop] }],
            TeammateIdle: [{ hooks: [hooks.onTeammateIdle] }],
            TaskCompleted: [{ hooks: [hooks.onTaskCompleted] }],
          },
        },
      });
    } catch (err) {
      console.error(`Failed to start query for session ${session.id}:`, err);
      session.status = 'error';
      this.broadcast({ type: 'session_status', sessionId: session.id, status: 'error' });
      this.broadcast({ type: 'error', message: `Failed to start agent: ${String(err)}`, sessionId: session.id });
      return;
    }

    this.activeSessions.set(session.id, { query: agentQuery, abortController });

    processLeadStream(session.id, agentQuery, this.leadStreamDeps()).catch((err) => {
      console.error(`Lead stream error for session ${session.id}:`, err);
      session.status = 'error';
      this.broadcast({ type: 'session_status', sessionId: session.id, status: 'error' });
      this.broadcast({ type: 'error', message: String(err), sessionId: session.id });
    });
  }

  private leadStreamDeps() {
    return {
      sessions: this.sessions,
      teammates: this.teammates,
      activeSessions: this.activeSessions,
      leadOutputs: this.leadOutputs,
      broadcast: this.broadcast,
      persistSession: (id: string) => this.persistSession(id),
      persistSessionDebounced: (id: string) => this.persistSessionDebounced(id),
      startTaskWatcher: (id: string, sdkId: string) => startTaskWatcher(id, sdkId, this.taskWatcherDeps()),
      loadTeammateOutputs: (id: string) => loadTeammateOutputs(id, this.transcriptDeps()),
      stopAllPolling: (id: string) => stopAllPolling(id, this.pollerDeps()),
    };
  }

  private taskWatcherDeps() {
    return {
      sessions: this.sessions,
      tasks: this.tasks,
      activeSessions: this.activeSessions,
      broadcast: this.broadcast,
      persistSession: (id: string) => this.persistSession(id),
    };
  }

  private pollerDeps(): PollerDeps {
    return {
      teammates: this.teammates,
      sessions: this.sessions,
      broadcast: this.broadcast,
    };
  }

  private transcriptDeps() {
    return {
      sessions: this.sessions,
      teammates: this.teammates,
      broadcast: this.broadcast,
      persistSession: (id: string) => this.persistSession(id),
    };
  }
}
