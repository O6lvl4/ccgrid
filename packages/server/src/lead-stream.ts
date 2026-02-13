import type { Query, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { Session, Teammate, ServerMessage } from '@ccgrid/shared';

export interface LeadStreamDeps {
  sessions: Map<string, Session>;
  teammates: Map<string, Teammate>;
  activeSessions: Map<string, unknown>;
  leadOutputs: Map<string, string>;
  broadcast: (msg: ServerMessage) => void;
  persistSession: (sessionId: string) => void;
  persistSessionDebounced: (sessionId: string) => void;
  startTaskWatcher: (sessionId: string, sdkSessionId: string) => void;
  loadTeammateOutputs: (sessionId: string) => Promise<void>;
  stopAllPolling: (sessionId: string) => void;
}

export async function processLeadStream(sessionId: string, agentQuery: Query, deps: LeadStreamDeps): Promise<void> {
  console.log(`[lead-stream] START ${sessionId.slice(0, 8)}`);
  for await (const message of agentQuery) {
    await handleLeadMessage(sessionId, message, deps);
  }
  console.log(`[lead-stream] END ${sessionId.slice(0, 8)}`);
}

async function handleLeadMessage(sessionId: string, message: SDKMessage, deps: LeadStreamDeps): Promise<void> {
  const session = deps.sessions.get(sessionId);
  if (!session) return;

  if (message.type !== 'stream_event') {
    console.log(`[lead-stream] ${sessionId.slice(0, 8)} type=${message.type}${'subtype' in message ? ` subtype=${message.subtype}` : ''}`);
  }

  switch (message.type) {
    case 'system':
      handleSystemInit(sessionId, session, message, deps);
      break;
    case 'stream_event':
      handleStreamDelta(sessionId, message, deps);
      break;
    case 'assistant':
      handleAssistantFallback(sessionId, message, deps);
      break;
    case 'result':
      await handleResult(sessionId, session, message, deps);
      break;
  }
}

function handleSystemInit(sessionId: string, session: Session, message: SDKMessage, deps: LeadStreamDeps): void {
  if (!('subtype' in message) || message.subtype !== 'init') return;
  session.sessionId = message.session_id;
  session.status = 'running';
  deps.persistSession(sessionId);
  deps.broadcast({ type: 'session_status', sessionId, status: 'running' });
  deps.startTaskWatcher(sessionId, message.session_id);
}

function handleStreamDelta(sessionId: string, message: SDKMessage, deps: LeadStreamDeps): void {
  const event = message.event as Record<string, unknown>;
  if (event.type !== 'content_block_delta') return;

  const delta = event.delta as Record<string, unknown> | undefined;
  if (!delta || delta.type !== 'text_delta' || typeof delta.text !== 'string') return;

  const existing = deps.leadOutputs.get(sessionId) ?? '';
  deps.leadOutputs.set(sessionId, existing + delta.text);
  deps.persistSessionDebounced(sessionId);
  deps.broadcast({ type: 'lead_output', sessionId, text: delta.text });
}

function handleAssistantFallback(sessionId: string, message: SDKMessage, deps: LeadStreamDeps): void {
  const existing = deps.leadOutputs.get(sessionId) ?? '';
  const assistantText = extractAssistantText(message);
  if (assistantText && !existing.endsWith(assistantText)) {
    deps.leadOutputs.set(sessionId, existing + assistantText);
    deps.persistSessionDebounced(sessionId);
    deps.broadcast({ type: 'lead_output', sessionId, text: assistantText });
  }
}

function extractAssistantText(message: SDKMessage): string {
  if ('content' in message && Array.isArray(message.content)) {
    let text = '';
    for (const block of message.content) {
      if (block && typeof block === 'object' && 'type' in block && block.type === 'text' && 'text' in block && typeof block.text === 'string') {
        text += block.text;
      }
    }
    return text;
  }
  if ('text' in message && typeof message.text === 'string') {
    return message.text;
  }
  return '';
}

async function handleResult(sessionId: string, session: Session, message: SDKMessage, deps: LeadStreamDeps): Promise<void> {
  session.costUsd = message.total_cost_usd;
  session.inputTokens = message.usage.input_tokens;
  session.outputTokens = message.usage.output_tokens;

  deps.broadcast({
    type: 'cost_update',
    sessionId,
    costUsd: session.costUsd,
    inputTokens: session.inputTokens,
    outputTokens: session.outputTokens,
  });

  appendResultText(sessionId, message, deps);

  session.status = message.subtype === 'success' ? 'completed' : 'error';
  deps.broadcast({ type: 'session_status', sessionId, status: session.status });
  deps.activeSessions.delete(sessionId);

  deps.stopAllPolling(sessionId);
  markTeammatesStopped(sessionId, deps);

  try {
    await deps.loadTeammateOutputs(sessionId);
  } catch (err) {
    console.error(`Failed to load teammate outputs for ${sessionId}:`, err);
  }

  deps.persistSession(sessionId);
}

function appendResultText(sessionId: string, message: SDKMessage, deps: LeadStreamDeps): void {
  if (message.subtype !== 'success' || !('result' in message) || typeof message.result !== 'string' || !message.result) return;
  const existing = deps.leadOutputs.get(sessionId) ?? '';
  if (!existing.endsWith(message.result) && !existing.includes(message.result)) {
    deps.leadOutputs.set(sessionId, existing + message.result);
    deps.broadcast({ type: 'lead_output', sessionId, text: message.result });
  }
}

function markTeammatesStopped(sessionId: string, deps: LeadStreamDeps): void {
  for (const teammate of deps.teammates.values()) {
    if (teammate.sessionId === sessionId && teammate.status !== 'stopped') {
      teammate.status = 'stopped';
      deps.broadcast({ type: 'teammate_status', sessionId, agentId: teammate.agentId, status: 'stopped' });
    }
  }
}
