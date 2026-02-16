import { query, type Query } from '@anthropic-ai/claude-agent-sdk';
import type { Session, TeammateSpec, SkillSpec, FileAttachment, Teammate, TeamTask, ServerMessage } from '@ccgrid/shared';
import { buildPrompt } from './prompt-builder.js';
import { processLeadStream } from './lead-stream.js';
import { createHookHandlers, type HookDeps } from './hook-handlers.js';
import { createCanUseTool, type PermissionMaps } from './permission-evaluator.js';
import { buildAgents } from './agent-builder.js';
import { buildPromptOrStream, buildQueryOptions, saveAttachmentsToTmp } from './query-helpers.js';

export interface LauncherDeps {
  sessions: Map<string, Session>;
  teammates: Map<string, Teammate>;
  tasks: Map<string, TeamTask[]>;
  activeSessions: Map<string, { query: Query; abortController: AbortController }>;
  leadOutputs: Map<string, string>;
  sessionGeneration: Map<string, number>;
  broadcast: (msg: ServerMessage) => void;
  permissionMaps: () => PermissionMaps;
  hookDeps: (session: Session) => Omit<HookDeps, 'sessionId' | 'teammates' | 'broadcast'>;
  leadStreamDeps: () => Parameters<typeof processLeadStream>[2];
}

export function launchAgent(
  opts: { session: Session; teammateSpecs?: TeammateSpec[]; maxBudgetUsd?: number; resumePrompt?: string; skillSpecs?: SkillSpec[]; files?: FileAttachment[] },
  deps: LauncherDeps,
): void {
  const { session, teammateSpecs, maxBudgetUsd, resumePrompt, skillSpecs, files } = opts;
  const abortController = new AbortController();

  const gen = (deps.sessionGeneration.get(session.id) ?? 0) + 1;
  deps.sessionGeneration.set(session.id, gen);

  const hookDeps = deps.hookDeps(session);
  const hooks = createHookHandlers({
    sessionId: session.id, teammates: deps.teammates, broadcast: deps.broadcast,
    ...hookDeps,
  });

  let prompt = resumePrompt ?? buildPrompt(teammateSpecs, session.taskDescription, skillSpecs, session.id);
  if (files && files.length > 0) {
    const savedPaths = saveAttachmentsToTmp(session.id, files);
    prompt += `\n\n添付ファイルが以下のパスに保存されています。テームメイトにはRead toolでこのパスを読ませてください:\n${savedPaths.map(p => `- ${p}`).join('\n')}`;
  }

  const specs = teammateSpecs ?? session.teammateSpecs;
  const agents = buildAgents(specs, skillSpecs);
  const promptOrStream = buildPromptOrStream(prompt, files);
  const isBypass = session.permissionMode === 'bypassPermissions';
  const canUseTool = createCanUseTool(session.id, deps.broadcast, deps.permissionMaps(), isBypass);
  const queryOpts = buildQueryOptions({ session, resumePrompt, maxBudgetUsd, abortController, agents, hooks, canUseTool });

  let agentQuery: Query;
  try {
    agentQuery = query({ prompt: promptOrStream, options: queryOpts });
  } catch (err) {
    console.error(`Failed to start query for session ${session.id}:`, err);
    session.status = 'error';
    deps.broadcast({ type: 'session_status', sessionId: session.id, status: 'error' });
    deps.broadcast({ type: 'error', message: `Failed to start agent: ${String(err)}`, sessionId: session.id });
    return;
  }

  deps.activeSessions.set(session.id, { query: agentQuery, abortController });

  processLeadStream(session.id, agentQuery, deps.leadStreamDeps()).catch((err) => {
    if (deps.sessionGeneration.get(session.id) !== gen) return;
    if (session.status === 'completed') return;
    console.error(`Lead stream error for session ${session.id}:`, err);
    session.status = 'error';
    deps.broadcast({ type: 'session_status', sessionId: session.id, status: 'error' });
    deps.broadcast({ type: 'error', message: String(err), sessionId: session.id });
  });
}
