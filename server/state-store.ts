import { readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import type { Session, Teammate, TeamTask, TeammateSpec } from '../shared/types.js';

const BASE_DIR = join(process.env.HOME ?? '', '.claude', 'claude-team');
const SESSIONS_DIR = join(BASE_DIR, 'sessions');
const SPECS_FILE = join(BASE_DIR, 'teammate-specs.json');

interface SessionFile {
  session: Session;
  teammates: Teammate[];
  tasks: TeamTask[];
  leadOutput: string;
}

export function loadAllSessions(): {
  sessions: Map<string, Session>;
  teammates: Map<string, Teammate>;
  tasks: Map<string, TeamTask[]>;
  leadOutputs: Map<string, string>;
} {
  const sessions = new Map<string, Session>();
  const teammates = new Map<string, Teammate>();
  const tasks = new Map<string, TeamTask[]>();
  const leadOutputs = new Map<string, string>();

  try {
    mkdirSync(SESSIONS_DIR, { recursive: true });
    const files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const raw = readFileSync(join(SESSIONS_DIR, file), 'utf-8');
        const data: SessionFile = JSON.parse(raw);
        sessions.set(data.session.id, data.session);
        for (const tm of data.teammates) {
          teammates.set(tm.agentId, tm);
        }
        if (data.tasks.length > 0) {
          tasks.set(data.session.id, data.tasks);
        }
        if (data.leadOutput) {
          leadOutputs.set(data.session.id, data.leadOutput);
        }
      } catch {
        // skip corrupt files
      }
    }
  } catch {
    // directory doesn't exist yet
  }

  return { sessions, teammates, tasks, leadOutputs };
}

export function saveSession(
  sessionId: string,
  session: Session,
  teammates: Teammate[],
  tasks: TeamTask[],
  leadOutput: string,
): void {
  const data: SessionFile = { session, teammates, tasks, leadOutput };
  try {
    mkdirSync(SESSIONS_DIR, { recursive: true });
    writeFileSync(join(SESSIONS_DIR, `${sessionId}.json`), JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Failed to save session ${sessionId}:`, err);
  }
}

export function deleteSessionFile(sessionId: string): void {
  try {
    unlinkSync(join(SESSIONS_DIR, `${sessionId}.json`));
  } catch {
    // file may not exist
  }
}

// ---- TeammateSpecs persistence ----

export function loadTeammateSpecs(): TeammateSpec[] {
  try {
    if (!existsSync(SPECS_FILE)) return [];
    const raw = readFileSync(SPECS_FILE, 'utf-8');
    return JSON.parse(raw) as TeammateSpec[];
  } catch {
    return [];
  }
}

export function saveTeammateSpecs(specs: TeammateSpec[]): void {
  try {
    mkdirSync(BASE_DIR, { recursive: true });
    writeFileSync(SPECS_FILE, JSON.stringify(specs, null, 2));
  } catch (err) {
    console.error('Failed to save teammate specs:', err);
  }
}
