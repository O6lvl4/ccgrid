import { query, type Query } from '@anthropic-ai/claude-agent-sdk';
import { v4 as uuidv4 } from 'uuid';
import type { Session, Teammate, TeamTask, TeammateSpec, SkillSpec, ServerMessage, PermissionLogEntry, FileAttachment } from '@ccgrid/shared';
import { loadAllSessions, saveSession, deleteSessionFile } from './state-store.js';
import { buildPrompt, buildFollowUpPrompt } from './prompt-builder.js';
import { processLeadStream } from './lead-stream.js';
import { createHookHandlers } from './hook-handlers.js';
import { startTaskWatcher, syncTasks } from './task-watcher.js';
import { loadTeammateOutputs, readTeammateTranscript } from './transcript-reader.js';
import { startPolling as startTranscriptPolling, stopPolling as stopTranscriptPolling, stopAllPolling, type PollerDeps } from './transcript-poller.js';
import { createCanUseTool, type PermissionMaps } from './permission-evaluator.js';
import { buildAgents } from './agent-builder.js';
import { buildPromptOrStream, buildQueryOptions, saveAttachmentsToTmp } from './query-helpers.js';

interface ActiveSession { query: Query; abortController: AbortController }

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
  private pendingPermissionMeta = new Map<string, { sessionId: string; toolName: string; description?: string; agentId?: string }>();

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
        this.broadcast({ type: 'teammate_output', sessionId: teammate.sessionId, agentId: teammate.agentId, text: output });
      }
    }
    for (const sessionId of sessionsToSave) this.persistSession(sessionId);
  }

  private persistSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const teammates = Array.from(this.teammates.values()).filter(t => t.sessionId === sessionId);
    const tasks = this.tasks.get(sessionId) ?? [];
    const leadOutput = this.leadOutputs.get(sessionId) ?? '';
    saveSession({ sessionId, session, teammates, tasks, leadOutput });
  }

  private persistSessionDebounced(sessionId: string): void {
    if (this.persistTimers.has(sessionId)) return;
    this.persistTimers.set(sessionId, setTimeout(() => {
      this.persistTimers.delete(sessionId);
      this.persistSession(sessionId);
    }, 3000));
  }

  // ---- Sessions CRUD ----

  async createSession(opts: {
    name: string; cwd: string; model: string; teammateSpecs: TeammateSpec[] | undefined;
    maxBudgetUsd: number | undefined; taskDescription: string;
    permissionMode?: 'acceptEdits' | 'bypassPermissions'; skillSpecs?: SkillSpec[];
    customInstructions?: string; files?: FileAttachment[];
  }): Promise<Session> {
    const { name, cwd, model, teammateSpecs, maxBudgetUsd, taskDescription, permissionMode, skillSpecs, customInstructions, files } = opts;
    const session: Session = {
      id: uuidv4(), name, cwd, model, taskDescription,
      ...(maxBudgetUsd !== undefined ? { maxBudgetUsd } : {}),
      ...(teammateSpecs && teammateSpecs.length > 0 ? { teammateSpecs } : {}),
      permissionMode: permissionMode ?? 'acceptEdits',
      ...(customInstructions ? { customInstructions } : {}),
      status: 'starting', costUsd: 0, inputTokens: 0, outputTokens: 0, createdAt: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    this.persistSession(session.id);
    this.broadcast({ type: 'session_created', session });

    this.startAgent({ session, teammateSpecs, maxBudgetUsd, skillSpecs, files });
    return session;
  }

  getSessions(): Session[] {
    for (const session of this.sessions.values()) {
      if ((session.status === 'running' || session.status === 'starting') && !this.activeSessions.has(session.id)) {
        session.status = 'completed'; this.persistSession(session.id);
      }
    }
    return Array.from(this.sessions.values());
  }

  getSession(sessionId: string): Session | undefined { return this.sessions.get(sessionId); }

  updateSession(sessionId: string, updates: { name?: string }): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    if (updates.name !== undefined) session.name = updates.name;
    this.persistSession(sessionId);
    this.broadcast({ type: 'session_status', sessionId, status: session.status });
    return session;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    await this.stopSession(sessionId);
    this.sessions.delete(sessionId); this.leadOutputs.delete(sessionId); this.tasks.delete(sessionId);
    for (const [agentId, tm] of this.teammates) { if (tm.sessionId === sessionId) this.teammates.delete(agentId); }
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

  continueSession(sessionId: string, prompt: string, files?: FileAttachment[]): Session | undefined {
    const session = this.sessions.get(sessionId);
    console.log(`[continueSession] sessionId=${sessionId} sdkSessionId=${session?.sessionId} status=${session?.status}`);
    if (!session?.sessionId || session.status !== 'completed') return undefined;

    let fileMarkdown = '';
    if (files && files.length > 0) {
      saveAttachmentsToTmp(sessionId, files);
      const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
      const lines = files.map(f => {
        const ext = f.name.includes('.') ? `.${f.name.split('.').pop()!.toLowerCase()}` : '';
        const url = `/api/sessions/${sessionId}/files/${encodeURIComponent(f.name)}`;
        return IMAGE_EXTS.has(ext) ? `> ![${f.name}](${url})` : `> 📎 [${f.name}](${url})`;
      });
      fileMarkdown = `\n${lines.join('\n')}`;
    }
    const userBlock = `\n\n<!-- follow-up -->\n\n> ${prompt.replace(/\n/g, '\n> ')}${fileMarkdown}\n\n`;
    const existing = this.leadOutputs.get(sessionId) ?? '';
    this.leadOutputs.set(sessionId, existing + userBlock);
    this.broadcast({ type: 'lead_output', sessionId, text: userBlock });

    session.status = 'running';
    this.persistSession(sessionId);
    this.broadcast({ type: 'session_status', sessionId, status: 'running' });

    const actionPrompt = buildFollowUpPrompt(prompt, session.teammateSpecs);
    this.startAgent({ session, maxBudgetUsd: session.maxBudgetUsd, resumePrompt: actionPrompt, files });
    return session;
  }

  // ---- Teammate messaging ----

  sendToTeammate(sessionId: string, teammateName: string, message: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const isRunningOrCompleted = session.status === 'running' || session.status === 'completed';
    if (!isRunningOrCompleted || !session.sessionId) return undefined;

    const marker = `\n\n<!-- teammate-message:${teammateName} -->\n\n> **To ${teammateName}:** ${message.replace(/\n/g, '\n> ')}\n\n`;
    const existing = this.leadOutputs.get(sessionId) ?? '';
    this.leadOutputs.set(sessionId, existing + marker);
    this.broadcast({ type: 'lead_output', sessionId, text: marker });

    this.broadcast({ type: 'teammate_message_relayed', sessionId, teammateName, message });

    if (session.status === 'completed') {
      const forwardPrompt = `The user has sent a message to teammate "${teammateName}". Please forward this message by resuming the teammate using the Task tool with the resume parameter:\n\nMessage to ${teammateName}: ${message}`;

      session.status = 'running';
      this.persistSession(sessionId);
      this.broadcast({ type: 'session_status', sessionId, status: 'running' });

      this.startAgent({ session, maxBudgetUsd: session.maxBudgetUsd, resumePrompt: forwardPrompt });
    }

    return session;
  }

  // ---- Permission resolution ----

  resolvePermission(requestId: string, behavior: 'allow' | 'deny', message?: string, updatedInput?: Record<string, unknown>): void {
    const pending = this.pendingPermissions.get(requestId);
    if (!pending) return;
    const originalInput = this.pendingPermissionInputs.get(requestId) ?? {};
    const meta = this.pendingPermissionMeta.get(requestId);
    this.pendingPermissions.delete(requestId);
    this.pendingPermissionInputs.delete(requestId);
    this.pendingPermissionMeta.delete(requestId);
    if (meta) {
      this.broadcast({ type: 'permission_resolved', entry: { requestId, sessionId: meta.sessionId, toolName: meta.toolName, input: updatedInput ?? originalInput, description: meta.description, agentId: meta.agentId, behavior, timestamp: new Date().toISOString() } as PermissionLogEntry });
    }
    if (behavior === 'allow') pending.resolve({ behavior: 'allow', updatedInput: updatedInput ?? originalInput });
    else pending.resolve({ behavior: 'deny', message: message ?? 'User denied' });
  }

  // ---- Read-only accessors ----
  getTeammates(sessionId?: string): Teammate[] { const all = Array.from(this.teammates.values()); return sessionId ? all.filter(t => t.sessionId === sessionId) : all; }
  getTeammate(agentId: string): Teammate | undefined { return this.teammates.get(agentId); }
  getTasks(sessionId: string): TeamTask[] { return this.tasks.get(sessionId) ?? []; }
  getAllTasks(): Record<string, TeamTask[]> { return Object.fromEntries(this.tasks); }
  getLeadOutput(sessionId: string): string { return this.leadOutputs.get(sessionId) ?? ''; }
  getLeadOutputs(): Record<string, string> { return Object.fromEntries(this.leadOutputs); }

  // ---- Internal ----
  private permissionMaps(): PermissionMaps { return { pendingPermissions: this.pendingPermissions, pendingPermissionInputs: this.pendingPermissionInputs, pendingPermissionMeta: this.pendingPermissionMeta }; }

  private startAgent(opts: { session: Session; teammateSpecs?: TeammateSpec[]; maxBudgetUsd?: number; resumePrompt?: string; skillSpecs?: SkillSpec[]; files?: FileAttachment[] }): void {
    const { session, teammateSpecs, maxBudgetUsd, resumePrompt, skillSpecs, files } = opts;
    const abortController = new AbortController();

    const hooks = createHookHandlers({
      sessionId: session.id, teammates: this.teammates, broadcast: this.broadcast,
      persistSession: (id) => this.persistSession(id),
      syncTasks: (id) => syncTasks(id, this.taskWatcherDeps()),
      startPolling: (agentId) => { if (session.sessionId) startTranscriptPolling({ sessionId: session.id, agentId, sdkSessionId: session.sessionId, cwd: session.cwd, deps: this.pollerDeps() }); },
      stopPolling: (agentId) => stopTranscriptPolling(agentId),
    });
    let prompt = resumePrompt ?? buildPrompt(teammateSpecs, session.taskDescription, skillSpecs);
    if (files && files.length > 0) {
      const savedPaths = saveAttachmentsToTmp(session.id, files);
      prompt += `\n\n添付ファイルが以下のパスに保存されています。テームメイトにはRead toolでこのパスを読ませてください:\n${savedPaths.map(p => `- ${p}`).join('\n')}`;
    }
    const agents = resumePrompt ? undefined : buildAgents(teammateSpecs, skillSpecs);
    const promptOrStream = buildPromptOrStream(prompt, files);
    const isBypass = session.permissionMode === 'bypassPermissions';
    const canUseTool = isBypass ? undefined : createCanUseTool(session.id, this.broadcast, this.permissionMaps());

    let agentQuery: Query;
    try {
      agentQuery = query({
        prompt: promptOrStream,
        options: buildQueryOptions({ session, resumePrompt, maxBudgetUsd, abortController, agents, hooks, canUseTool }),
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

  private pollerDeps(): PollerDeps { return { teammates: this.teammates, sessions: this.sessions, broadcast: this.broadcast }; }
  private taskWatcherDeps() { return { sessions: this.sessions, tasks: this.tasks, activeSessions: this.activeSessions, broadcast: this.broadcast, persistSession: (id: string) => this.persistSession(id) }; }
  private leadStreamDeps() {
    return {
      sessions: this.sessions, teammates: this.teammates, activeSessions: this.activeSessions,
      leadOutputs: this.leadOutputs, broadcast: this.broadcast,
      persistSession: (id: string) => this.persistSession(id),
      persistSessionDebounced: (id: string) => this.persistSessionDebounced(id),
      startTaskWatcher: (id: string, sdkId: string) => startTaskWatcher(id, sdkId, this.taskWatcherDeps()),
      loadTeammateOutputs: (id: string) => loadTeammateOutputs(id, { sessions: this.sessions, teammates: this.teammates, broadcast: this.broadcast, persistSession: (sid: string) => this.persistSession(sid) }),
      stopAllPolling: (id: string) => stopAllPolling(id, this.pollerDeps()),
    };
  }
}
