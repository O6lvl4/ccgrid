import { join } from 'path';
import type { Teammate, Session, ServerMessage } from '../shared/types.js';
import { readTranscriptFromPath, encodeCwd } from './transcript-reader.js';

const PROJECTS_DIR = join(process.env.HOME ?? '', '.claude', 'projects');
const POLL_INTERVAL = 3000;

export interface PollerDeps {
  teammates: Map<string, Teammate>;
  sessions: Map<string, Session>;
  broadcast: (msg: ServerMessage) => void;
}

const activeTimers = new Map<string, ReturnType<typeof setInterval>>();
const lastOutputs = new Map<string, string>();

export function startPolling(
  sessionId: string,
  agentId: string,
  sdkSessionId: string,
  cwd: string,
  deps: PollerDeps,
): void {
  if (activeTimers.has(agentId)) return;

  const transcriptPath = join(
    PROJECTS_DIR,
    encodeCwd(cwd),
    sdkSessionId,
    'subagents',
    `agent-${agentId}.jsonl`,
  );

  const timer = setInterval(async () => {
    try {
      const output = await readTranscriptFromPath(transcriptPath);
      if (!output) return;

      const prev = lastOutputs.get(agentId);
      if (prev === output) return;

      lastOutputs.set(agentId, output);

      const teammate = deps.teammates.get(agentId);
      if (teammate) {
        teammate.output = output;
      }

      deps.broadcast({
        type: 'teammate_output',
        sessionId,
        agentId,
        text: output,
      });
    } catch {
      // transcript file may not exist yet
    }
  }, POLL_INTERVAL);

  activeTimers.set(agentId, timer);
}

export function stopPolling(agentId: string): void {
  const timer = activeTimers.get(agentId);
  if (timer) {
    clearInterval(timer);
    activeTimers.delete(agentId);
    lastOutputs.delete(agentId);
  }
}

export function stopAllPolling(sessionId: string, deps: PollerDeps): void {
  for (const [agentId, teammate] of deps.teammates) {
    if (teammate.sessionId === sessionId && activeTimers.has(agentId)) {
      stopPolling(agentId);
    }
  }
}
