import { type Query } from '@anthropic-ai/claude-agent-sdk';
import { v4 as uuidv4 } from 'uuid';
import type { Session, Teammate, TeamTask, TeammateSpec, SkillSpec, ServerMessage, PermissionLogEntry, FileAttachment, TeammateMessage } from '@ccgrid/shared';
import { loadAllSessions, saveSession, deleteSessionFile } from './state-store.js';
import { buildFollowUpPrompt } from './prompt-builder.js';
import { startTaskWatcher, syncTasks } from './task-watcher.js';
import { loadTeammateOutputs, readTeammateTranscript } from './transcript-reader.js';
import { startPolling as startTranscriptPolling, stopPolling as stopTranscriptPolling, stopAllPolling, type PollerDeps } from './transcript-poller.js';
import { type PermissionMaps } from './permission-evaluator.js';
import { saveAttachmentsToTmp, cleanupAttachments } from './query-helpers.js';
import { sendToTeammate as sendToTeammateFn, sendTeammateMessage as sendTeammateMessageFn, type MessagingDeps } from './teammate-messaging.js';
import { launchAgent, type LauncherDeps } from './agent-launcher.js';

interface ActiveSession { query: Query; abortController: AbortController }

export class SessionManager {
  private sessions: Map<string, Session>;
  private activeSessions = new Map<string, ActiveSession>();
  private teammates: Map<string, Teammate>;
  private tasks: Map<string, TeamTask[]>;
  private leadOutputs: Map<string, string>;
  private broadcast: (msg: ServerMessage) => void;
  private persistTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private sessionGeneration = new Map<string, number>();
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
    const toSave = new Set<string>();
    for (const tm of this.teammates.values()) {
      if (tm.output) continue;
      const s = this.sessions.get(tm.sessionId);
      if (!s?.sessionId) continue;
      const output = await readTeammateTranscript(s.cwd, s.sessionId, tm.agentId);
      if (!output) continue;
      tm.output = output;
      toSave.add(tm.sessionId);
      this.broadcast({ type: 'teammate_output', sessionId: tm.sessionId, agentId: tm.agentId, text: output });
    }
    for (const id of toSave) this.persistSession(id);
  }

  private persistSession(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;
    saveSession({ sessionId: id, session, teammates: [...this.teammates.values()].filter(t => t.sessionId === id), tasks: this.tasks.get(id) ?? [], leadOutput: this.leadOutputs.get(id) ?? '' });
  }

  private persistSessionDebounced(id: string): void {
    if (this.persistTimers.has(id)) return;
    this.persistTimers.set(id, setTimeout(() => { this.persistTimers.delete(id); this.persistSession(id); }, 3000));
  }

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

  getSessions(): Session[] { return Array.from(this.sessions.values()); }
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
    this.cleanupPendingForSession(sessionId);
    cleanupAttachments(sessionId);
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

  async continueSession(sessionId: string, prompt: string, files?: FileAttachment[]): Promise<Session | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session?.sessionId || session.status === 'starting') return undefined;

    const timer = this.autoCompleteTimer.get(sessionId);
    if (timer) { clearTimeout(timer); this.autoCompleteTimer.delete(sessionId); }
    if (session.status === 'running') await this.stopSession(sessionId);
    if (session.status !== 'completed') { session.status = 'completed'; this.persistSession(sessionId); }

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

    const actionPrompt = buildFollowUpPrompt(prompt, session.teammateSpecs, sessionId);
    this.startAgent({ session, maxBudgetUsd: session.maxBudgetUsd, resumePrompt: actionPrompt, files });
    return session;
  }

  private autoCompleteTimer = new Map<string, ReturnType<typeof setTimeout>>();

  private autoCompleteSession(sessionId: string): void {
    if (this.autoCompleteTimer.has(sessionId)) clearTimeout(this.autoCompleteTimer.get(sessionId)!);
    this.autoCompleteTimer.set(sessionId, setTimeout(async () => {
      this.autoCompleteTimer.delete(sessionId);
      const session = this.sessions.get(sessionId);
      if (!session || session.status !== 'running') return;
      const tms = Array.from(this.teammates.values()).filter(t => t.sessionId === sessionId);
      if (tms.length === 0 || !tms.every(t => t.status === 'stopped' || t.status === 'idle')) return;
      await this.stopSession(sessionId);
      session.status = 'completed';
      this.persistSession(sessionId);
      await this.continueSession(sessionId, '[SYSTEM] All teammates have completed their work. Write a comprehensive final summary of what each teammate accomplished, then end with a text-only response (no tool calls) to close the session.');
    }, 5000));
  }

  private messagingDeps(): MessagingDeps {
    return {
      sessions: this.sessions, teammates: this.teammates, activeSessions: this.activeSessions,
      leadOutputs: this.leadOutputs, broadcast: this.broadcast,
      persistSession: (id) => this.persistSession(id),
      startAgent: (opts) => this.startAgent(opts),
    };
  }

  sendToTeammate(sessionId: string, teammateName: string, message: string): Session | undefined {
    return sendToTeammateFn(sessionId, teammateName, message, this.messagingDeps());
  }

  async sendTeammateMessage(sessionId: string, message: TeammateMessage): Promise<void> {
    sendTeammateMessageFn(sessionId, message, this.messagingDeps());
  }

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
  resolveUserQuestion(requestId: string, answer: string): void {
    const meta = this.pendingPermissionMeta.get(requestId);
    if (meta) {
      const answerBlock = `\n\n> **Your answer:** ${answer}\n\n`;
      const existing = this.leadOutputs.get(meta.sessionId) ?? '';
      this.leadOutputs.set(meta.sessionId, existing + answerBlock);
      this.broadcast({ type: 'lead_output', sessionId: meta.sessionId, text: answerBlock });
    }
    this.resolvePermission(requestId, 'deny', `ユーザーの回答: ${answer}`);
  }
  getTeammates(sessionId?: string): Teammate[] { const all = Array.from(this.teammates.values()); return sessionId ? all.filter(t => t.sessionId === sessionId) : all; }
  getTeammate(agentId: string): Teammate | undefined { return this.teammates.get(agentId); }
  getTasks(sessionId: string): TeamTask[] { return this.tasks.get(sessionId) ?? []; }
  getAllTasks(): Record<string, TeamTask[]> { return Object.fromEntries(this.tasks); }
  getLeadOutput(sessionId: string): string { return this.leadOutputs.get(sessionId) ?? ''; }
  getLeadOutputs(): Record<string, string> { return Object.fromEntries(this.leadOutputs); }

  getPendingPermissions() {
    return [...this.pendingPermissionMeta].filter(([, m]) => m.toolName !== 'AskUserQuestion').map(([requestId, m]) => (
      { sessionId: m.sessionId, requestId, toolName: m.toolName, input: this.pendingPermissionInputs.get(requestId) ?? {}, description: m.description, agentId: m.agentId }
    ));
  }

  getPendingQuestions() {
    return [...this.pendingPermissionMeta].filter(([, m]) => m.toolName === 'AskUserQuestion').map(([requestId, m]) => (
      { sessionId: m.sessionId, requestId, question: m.description ?? '', agentId: m.agentId }
    ));
  }

  private cleanupPendingForSession(sessionId: string): void {
    for (const [requestId, meta] of this.pendingPermissionMeta) {
      if (meta.sessionId !== sessionId) continue;
      const pending = this.pendingPermissions.get(requestId);
      if (pending) pending.resolve({ behavior: 'deny', message: 'Session deleted' });
      this.pendingPermissions.delete(requestId);
      this.pendingPermissionInputs.delete(requestId);
      this.pendingPermissionMeta.delete(requestId);
    }
  }

  private permissionMaps(): PermissionMaps { return { pendingPermissions: this.pendingPermissions, pendingPermissionInputs: this.pendingPermissionInputs, pendingPermissionMeta: this.pendingPermissionMeta }; }
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

  private launcherDeps(): LauncherDeps {
    return {
      sessions: this.sessions, teammates: this.teammates, tasks: this.tasks,
      activeSessions: this.activeSessions, leadOutputs: this.leadOutputs,
      sessionGeneration: this.sessionGeneration, broadcast: this.broadcast,
      permissionMaps: () => this.permissionMaps(),
      hookDeps: (session) => ({
        persistSession: (id) => this.persistSession(id),
        syncTasks: (id) => syncTasks(id, this.taskWatcherDeps()),
        startPolling: (agentId) => { if (session.sessionId) startTranscriptPolling({ sessionId: session.id, agentId, sdkSessionId: session.sessionId, cwd: session.cwd, deps: this.pollerDeps() }); },
        stopPolling: (agentId) => stopTranscriptPolling(agentId),
        getSdkSessionId: () => session.sessionId,
        sendTeammateMessage: (sid, message) => this.sendTeammateMessage(sid, message),
        onAllTeammatesDone: (id) => this.autoCompleteSession(id),
      }),
      leadStreamDeps: () => this.leadStreamDeps(),
    };
  }

  private startAgent(opts: { session: Session; teammateSpecs?: TeammateSpec[]; maxBudgetUsd?: number; resumePrompt?: string; skillSpecs?: SkillSpec[]; files?: FileAttachment[] }): void {
    launchAgent(opts, this.launcherDeps());
  }
}
