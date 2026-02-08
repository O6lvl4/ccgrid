import type { Query, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { Session, Teammate, ServerMessage } from '../shared/types.js';

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
}

export async function processLeadStream(sessionId: string, agentQuery: Query, deps: LeadStreamDeps): Promise<void> {
  for await (const message of agentQuery) {
    await handleLeadMessage(sessionId, message, deps);
  }
}

async function handleLeadMessage(sessionId: string, message: SDKMessage, deps: LeadStreamDeps): Promise<void> {
  const session = deps.sessions.get(sessionId);
  if (!session) return;

  switch (message.type) {
    case 'system': {
      if ('subtype' in message && message.subtype === 'init') {
        session.sessionId = message.session_id;
        session.status = 'running';
        deps.persistSession(sessionId);
        deps.broadcast({ type: 'session_status', sessionId, status: 'running' });
        deps.startTaskWatcher(sessionId, message.session_id);
      }
      break;
    }

    case 'stream_event': {
      const event = message.event as Record<string, unknown>;
      if (event.type === 'content_block_delta') {
        const delta = event.delta as Record<string, unknown> | undefined;
        if (delta && delta.type === 'text_delta' && typeof delta.text === 'string') {
          const existing = deps.leadOutputs.get(sessionId) ?? '';
          deps.leadOutputs.set(sessionId, existing + delta.text);
          deps.persistSessionDebounced(sessionId);
          deps.broadcast({ type: 'lead_output', sessionId, text: delta.text });
        }
      }
      break;
    }

    case 'assistant': {
      // Text already streamed via stream_event deltas; skip to avoid duplication
      break;
    }

    case 'result': {
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

      // Capture final result text if available (success case)
      if (message.subtype === 'success' && 'result' in message && typeof message.result === 'string' && message.result) {
        const existing = deps.leadOutputs.get(sessionId) ?? '';
        // Only append if not already captured via stream deltas
        if (!existing.endsWith(message.result) && !existing.includes(message.result)) {
          deps.leadOutputs.set(sessionId, existing + message.result);
          deps.broadcast({ type: 'lead_output', sessionId, text: message.result });
        }
      }

      session.status = message.subtype === 'success' ? 'completed' : 'error';
      deps.broadcast({ type: 'session_status', sessionId, status: session.status });
      deps.activeSessions.delete(sessionId);

      // Mark all teammates for this session as stopped
      for (const teammate of deps.teammates.values()) {
        if (teammate.sessionId === sessionId && teammate.status !== 'stopped') {
          teammate.status = 'stopped';
          deps.broadcast({ type: 'teammate_status', sessionId, agentId: teammate.agentId, status: 'stopped' });
        }
      }

      // Load teammate outputs then persist
      try {
        await deps.loadTeammateOutputs(sessionId);
      } catch (err) {
        console.error(`Failed to load teammate outputs for ${sessionId}:`, err);
      }

      deps.persistSession(sessionId);
      break;
    }
  }
}
