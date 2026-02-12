import { readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import type { Session, Teammate, TeamTask, TeammateSpec, SkillSpec, PermissionRule } from '@ccgrid/shared';

const HOME = process.env.HOME ?? '';
const BASE_DIR = join(HOME, '.claude', 'claude-team');
const SESSIONS_DIR = join(BASE_DIR, 'sessions');
const SPECS_FILE = join(BASE_DIR, 'teammate-specs.json');
const SKILL_SPECS_FILE = join(BASE_DIR, 'skill-specs.json');
const PERMISSION_RULES_FILE = join(BASE_DIR, 'permission-rules.json');
const TASKS_DIR = join(HOME, '.claude', 'tasks');
const TEAMS_DIR = join(HOME, '.claude', 'teams');

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
        } else if (data.session.sessionId) {
          // Try loading tasks from ~/.claude/tasks/{team-name}/ or ~/.claude/tasks/{sdkSessionId}/
          const liveTasks = loadTasksFromDisk(data.session.sessionId);
          if (liveTasks.length > 0) {
            tasks.set(data.session.id, liveTasks);
          }
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

// ---- Load tasks from ~/.claude/tasks/ ----

function findTaskDirSync(sdkSessionId: string): string | null {
  // 1. Scan team configs for matching leadSessionId
  if (existsSync(TEAMS_DIR)) {
    try {
      const teamDirs = readdirSync(TEAMS_DIR);
      for (const teamName of teamDirs) {
        const configPath = join(TEAMS_DIR, teamName, 'config.json');
        if (!existsSync(configPath)) continue;
        try {
          const raw = readFileSync(configPath, 'utf-8');
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

function loadTasksFromDisk(sdkSessionId: string): TeamTask[] {
  const taskDir = findTaskDirSync(sdkSessionId);
  if (!taskDir) return [];

  try {
    const files = readdirSync(taskDir).filter(f => f.endsWith('.json'));
    const tasks: TeamTask[] = [];
    for (const file of files) {
      try {
        const content = readFileSync(join(taskDir, file), 'utf-8');
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

// ---- SkillSpecs persistence ----

export function loadSkillSpecs(): SkillSpec[] {
  try {
    if (!existsSync(SKILL_SPECS_FILE)) return [];
    const raw = readFileSync(SKILL_SPECS_FILE, 'utf-8');
    return JSON.parse(raw) as SkillSpec[];
  } catch {
    return [];
  }
}

export function saveSkillSpecs(specs: SkillSpec[]): void {
  try {
    mkdirSync(BASE_DIR, { recursive: true });
    writeFileSync(SKILL_SPECS_FILE, JSON.stringify(specs, null, 2));
  } catch (err) {
    console.error('Failed to save skill specs:', err);
  }
}

// ---- PermissionRules persistence ----

export function loadPermissionRules(): PermissionRule[] {
  try {
    if (!existsSync(PERMISSION_RULES_FILE)) return [];
    const raw = readFileSync(PERMISSION_RULES_FILE, 'utf-8');
    return JSON.parse(raw) as PermissionRule[];
  } catch {
    return [];
  }
}

export function savePermissionRules(rules: PermissionRule[]): void {
  try {
    mkdirSync(BASE_DIR, { recursive: true });
    writeFileSync(PERMISSION_RULES_FILE, JSON.stringify(rules, null, 2));
  } catch (err) {
    console.error('Failed to save permission rules:', err);
  }
}
