import type { HookCallback } from '@anthropic-ai/claude-agent-sdk';
import type { Teammate, ServerMessage, TeamTask, TeammateMessage } from '@ccgrid/shared';
import { readTranscriptFromPath } from './transcript-reader.js';
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface HookDeps {
  sessionId: string;
  teammates: Map<string, Teammate>;
  broadcast: (msg: ServerMessage) => void;
  persistSession: (sessionId: string) => void;
  syncTasks: (sessionId: string) => Promise<void>;
  startPolling: (agentId: string) => void;
  stopPolling: (agentId: string) => void;
  getSdkSessionId: () => string | undefined;
  sendTeammateMessage?: (sessionId: string, message: TeammateMessage) => Promise<void>;
}

const HOME = process.env.HOME ?? '';
const TASKS_DIR = join(HOME, '.claude', 'tasks');
const TEAMS_DIR = join(HOME, '.claude', 'teams');

export function createHookHandlers(deps: HookDeps) {
  const { sessionId, teammates, broadcast, persistSession, syncTasks, startPolling, stopPolling, getSdkSessionId, sendTeammateMessage } = deps;

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

        // Check teammate output for SendMessage markers
        if (teammate.output && sendTeammateMessage) {
          await detectAndProcessMessages(teammate, sessionId, sendTeammateMessage);
        }
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

      // Automatic task unblocking
      await unblockDependentTasks(input.task_id);

      await syncTasks(sessionId);
    }
    return {};
  };

  /**
   * Automatically unblock tasks that were blocked by the completed task.
   * Scans all tasks and removes the completed task ID from their blockedBy arrays.
   */
  async function unblockDependentTasks(completedTaskId: string): Promise<void> {
    try {
      const sdkSessionId = getSdkSessionId();
      if (!sdkSessionId) return;

      const taskDir = await findTaskDir(sdkSessionId);
      if (!taskDir) return;

      const allTasks = await loadAllTasks(taskDir);

      // Find tasks that have the completed task in their blocks array
      for (const task of allTasks) {
        if (task.blocks && task.blocks.includes(completedTaskId)) {
          // Remove completed task ID from blockedBy array
          if (task.blockedBy && task.blockedBy.includes(completedTaskId)) {
            task.blockedBy = task.blockedBy.filter(id => id !== completedTaskId);
            await saveTask(taskDir, task);
          }
        }
      }
    } catch (err) {
      console.error('Failed to unblock dependent tasks:', err);
    }
  }

  /**
   * Find the task directory for the current session.
   * Scans team configs or falls back to SDK session ID.
   */
  async function findTaskDir(sdkSessionId: string): Promise<string | null> {
    // 1. Try team-name based directory by scanning team configs
    const teamDir = await scanTeamConfigs(sdkSessionId);
    if (teamDir) return teamDir;

    // 2. Fallback: SDK session ID based directory
    const sdkTaskDir = join(TASKS_DIR, sdkSessionId);
    if (existsSync(sdkTaskDir)) return sdkTaskDir;

    return null;
  }

  /**
   * Scan team configs to find task directory matching the SDK session ID.
   */
  async function scanTeamConfigs(sdkSessionId: string): Promise<string | null> {
    if (!existsSync(TEAMS_DIR)) return null;
    try {
      const teamDirs = await readdir(TEAMS_DIR);
      for (const teamName of teamDirs) {
        const configPath = join(TEAMS_DIR, teamName, 'config.json');
        if (!existsSync(configPath)) continue;
        try {
          const raw = await readFile(configPath, 'utf-8');
          const config = JSON.parse(raw);
          if (config.leadSessionId === sdkSessionId) {
            const teamTaskDir = join(TASKS_DIR, teamName);
            if (existsSync(teamTaskDir)) return teamTaskDir;
          }
        } catch {
          // skip invalid config
        }
      }
    } catch {
      // teams dir read failed
    }
    return null;
  }

  /**
   * Load all tasks from the task directory.
   */
  async function loadAllTasks(taskDir: string): Promise<TeamTask[]> {
    try {
      const files = await readdir(taskDir);
      const taskFiles = files.filter(f => f.endsWith('.json'));
      const tasks: TeamTask[] = [];

      for (const file of taskFiles) {
        try {
          const content = await readFile(join(taskDir, file), 'utf-8');
          const data = JSON.parse(content);
          tasks.push({
            id: data.id ?? file.replace('.json', ''),
            subject: data.subject ?? 'Untitled',
            description: data.description,
            status: data.status ?? 'pending',
            assignedAgentId: data.owner,
            blocks: data.blocks ?? [],
            blockedBy: data.blockedBy ?? [],
          });
        } catch {
          // skip invalid files
        }
      }
      return tasks;
    } catch {
      return [];
    }
  }

  /**
   * Save a task back to disk.
   */
  async function saveTask(taskDir: string, task: TeamTask): Promise<void> {
    try {
      const taskPath = join(taskDir, `${task.id}.json`);
      const data = {
        id: task.id,
        subject: task.subject,
        description: task.description,
        status: task.status,
        owner: task.assignedAgentId,
        blocks: task.blocks,
        blockedBy: task.blockedBy,
      };
      await writeFile(taskPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error(`Failed to save task ${task.id}:`, err);
    }
  }

  /**
   * Detect SendMessage markers in teammate output and process them.
   * Marker format: <!-- send-message:{"type":"message","recipient":"researcher",...} -->
   */
  async function detectAndProcessMessages(
    teammate: Teammate,
    sessionId: string,
    sendTeammateMessage: (sessionId: string, message: TeammateMessage) => Promise<void>
  ): Promise<void> {
    if (!teammate.output) return;

    const messagePattern = /<!-- send-message:(.*?) -->/g;
    const matches = [...teammate.output.matchAll(messagePattern)];

    for (const match of matches) {
      try {
        const messageJson = match[1];
        const parsed = JSON.parse(messageJson);

        const message: TeammateMessage = {
          type: parsed.type,
          sender: teammate.name ?? teammate.agentId,
          recipient: parsed.recipient,
          content: parsed.content,
          summary: parsed.summary,
          requestId: parsed.requestId,
          approve: parsed.approve,
          timestamp: new Date().toISOString(),
        };

        console.log(`[detectAndProcessMessages] Found message from ${message.sender} type=${message.type}`);
        await sendTeammateMessage(sessionId, message);
      } catch (err) {
        console.error('[detectAndProcessMessages] Failed to parse message marker:', err);
      }
    }
  }

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
