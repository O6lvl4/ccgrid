import type { HookCallback } from '@anthropic-ai/claude-agent-sdk';
import type { Teammate, ServerMessage } from '../shared/types.js';
import { readTranscriptFromPath } from './transcript-reader.js';

export interface HookDeps {
  sessionId: string;
  teammates: Map<string, Teammate>;
  broadcast: (msg: ServerMessage) => void;
  persistSession: (sessionId: string) => void;
  syncTasks: (sessionId: string) => Promise<void>;
  startPolling: (agentId: string) => void;
  stopPolling: (agentId: string) => void;
}

export function createHookHandlers(deps: HookDeps) {
  const { sessionId, teammates, broadcast, persistSession, syncTasks, startPolling, stopPolling } = deps;

  const onSubagentStart: HookCallback = async (input) => {
    if (input.hook_event_name === 'SubagentStart') {
      const teammate: Teammate = {
        agentId: input.agent_id,
        sessionId,
        agentType: input.agent_type,
        status: 'starting',
      };
      teammates.set(input.agent_id, teammate);
      persistSession(sessionId);
      broadcast({ type: 'teammate_discovered', sessionId, teammate });
      startPolling(input.agent_id);
    }
    return {};
  };

  const onSubagentStop: HookCallback = async (input) => {
    if (input.hook_event_name === 'SubagentStop') {
      stopPolling(input.agent_id);
      const teammate = teammates.get(input.agent_id);
      if (teammate) {
        teammate.status = 'stopped';
        teammate.transcriptPath = input.agent_transcript_path;
        broadcast({ type: 'teammate_status', sessionId, agentId: input.agent_id, status: 'stopped' });

        // Load and broadcast output immediately when teammate stops
        if (!teammate.output && input.agent_transcript_path) {
          const output = await readTranscriptFromPath(input.agent_transcript_path);
          if (output) {
            teammate.output = output;
            broadcast({
              type: 'teammate_output',
              sessionId,
              agentId: input.agent_id,
              text: output,
            });
          }
        }

        persistSession(sessionId);
      }
    }
    return {};
  };

  const onTeammateIdle: HookCallback = async (input) => {
    if (input.hook_event_name === 'TeammateIdle') {
      const teammate = findTeammateByName(teammates, sessionId, input.teammate_name);
      if (teammate) {
        teammate.status = 'idle';
        teammate.name = input.teammate_name;
        persistSession(sessionId);
        broadcast({ type: 'teammate_status', sessionId, agentId: teammate.agentId, status: 'idle', name: input.teammate_name });
      }
    }
    return {};
  };

  const onTaskCompleted: HookCallback = async (input) => {
    if (input.hook_event_name === 'TaskCompleted') {
      broadcast({
        type: 'task_completed',
        sessionId,
        taskId: input.task_id,
        taskSubject: input.task_subject,
        teammateName: input.teammate_name,
      });
      await syncTasks(sessionId);
    }
    return {};
  };

  return { onSubagentStart, onSubagentStop, onTeammateIdle, onTaskCompleted };
}

function findTeammateByName(teammates: Map<string, Teammate>, sessionId: string, name: string): Teammate | undefined {
  for (const teammate of teammates.values()) {
    if (teammate.sessionId === sessionId && teammate.name === name) return teammate;
  }
  // If name not yet assigned, find first unnamed teammate for this session
  for (const teammate of teammates.values()) {
    if (teammate.sessionId === sessionId && !teammate.name) return teammate;
  }
  return undefined;
}
