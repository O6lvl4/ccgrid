import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { Session, TeamTask, ServerMessage } from '@ccgrid/shared';

const HOME = process.env.HOME ?? '';
const TASKS_DIR = join(HOME, '.claude', 'tasks');
const TEAMS_DIR = join(HOME, '.claude', 'teams');

export interface TaskWatcherDeps {
  sessions: Map<string, Session>;
  tasks: Map<string, TeamTask[]>;
  activeSessions: Map<string, unknown>;
  broadcast: (msg: ServerMessage) => void;
  persistSession: (sessionId: string) => void;
}

export function startTaskWatcher(sessionId: string, sdkSessionId: string, deps: TaskWatcherDeps): void {
  // Initial sync
  syncTasks(sessionId, deps);

  // Poll for changes (fs.watch is unreliable on macOS for new files)
  const interval = setInterval(async () => {
    if (!deps.activeSessions.has(sessionId)) {
      clearInterval(interval);
      return;
    }
    await syncTasks(sessionId, deps);
  }, 2000);
}

/**
 * Find the task directory for a session.
 * Agent teams store tasks under ~/.claude/tasks/{team-name}/
 * where the team-name is discovered by scanning ~/.claude/teams/ configs
 * for a matching leadSessionId.
 * Falls back to ~/.claude/tasks/{sdkSessionId}/ for non-team sessions.
 */
async function findTaskDir(sdkSessionId: string): Promise<string | null> {
  // 1. Try team-name based directory by scanning team configs
  if (existsSync(TEAMS_DIR)) {
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
  }

  // 2. Fallback: SDK session ID based directory
  const sdkTaskDir = join(TASKS_DIR, sdkSessionId);
  if (existsSync(sdkTaskDir)) return sdkTaskDir;

  return null;
}

export async function syncTasks(sessionId: string, deps: TaskWatcherDeps): Promise<void> {
  const session = deps.sessions.get(sessionId);
  if (!session?.sessionId) return;

  const taskDir = await findTaskDir(session.sessionId);
  if (!taskDir) return;

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

    deps.tasks.set(sessionId, tasks);
    deps.persistSession(sessionId);
    deps.broadcast({ type: 'task_sync', sessionId, tasks });
  } catch {
    // directory might not exist yet
  }
}
