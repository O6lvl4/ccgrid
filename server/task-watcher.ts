import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { Session, TeamTask, ServerMessage } from '../shared/types.js';

const TASKS_DIR = join(process.env.HOME ?? '', '.claude', 'tasks');

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

export async function syncTasks(sessionId: string, deps: TaskWatcherDeps): Promise<void> {
  const session = deps.sessions.get(sessionId);
  if (!session?.sessionId) return;

  const taskDir = join(TASKS_DIR, session.sessionId);
  if (!existsSync(taskDir)) return;

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
