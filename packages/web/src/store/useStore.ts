import { create } from 'zustand';
import type { Session, Teammate, TeamTask, TeammateSpec, ServerMessage } from '@ccgrid/shared';

// ---- Navigation ----
export type SessionTab = 'output' | 'teammates' | 'tasks' | 'overview';

export type ViewRoute =
  | { view: 'session_list' }
  | { view: 'session_detail'; sessionId: string; tab: SessionTab }
  | { view: 'teammate_detail'; sessionId: string; agentId: string }
  | { view: 'task_detail'; sessionId: string; taskId: string }
  | { view: 'teammate_spec_list' }
  | { view: 'teammate_spec_detail'; specId: string };

// ---- Path <-> Route conversion ----

const SESSION_TABS = new Set<string>(['output', 'teammates', 'tasks', 'overview']);

function routeToPath(route: ViewRoute): string {
  switch (route.view) {
    case 'session_list':
      return '/';
    case 'session_detail':
      return `/sessions/${route.sessionId}/${route.tab}`;
    case 'teammate_detail':
      return `/sessions/${route.sessionId}/teammates/${route.agentId}`;
    case 'task_detail':
      return `/sessions/${route.sessionId}/tasks/${route.taskId}`;
    case 'teammate_spec_list':
      return '/specs';
    case 'teammate_spec_detail':
      return `/specs/${route.specId}`;
  }
}

function pathToRoute(pathname: string): ViewRoute {
  const parts = pathname.split('/').filter(Boolean);

  // /specs/:specId
  if (parts[0] === 'specs' && parts[1]) {
    return { view: 'teammate_spec_detail', specId: parts[1] };
  }
  // /specs
  if (parts[0] === 'specs') {
    return { view: 'teammate_spec_list' };
  }
  // /sessions/:id/teammates/:agentId
  if (parts[0] === 'sessions' && parts[1] && parts[2] === 'teammates' && parts[3]) {
    return { view: 'teammate_detail', sessionId: parts[1], agentId: parts[3] };
  }
  // /sessions/:id/tasks/:taskId
  if (parts[0] === 'sessions' && parts[1] && parts[2] === 'tasks' && parts[3]) {
    return { view: 'task_detail', sessionId: parts[1], taskId: parts[3] };
  }
  // /sessions/:id/:tab
  if (parts[0] === 'sessions' && parts[1]) {
    const tab = SESSION_TABS.has(parts[2] ?? '') ? (parts[2] as SessionTab) : 'output';
    return { view: 'session_detail', sessionId: parts[1], tab };
  }
  // /
  return { view: 'session_list' };
}

// ---- Store ----

export interface PendingPermission {
  sessionId: string;
  requestId: string;
  toolName: string;
  input: Record<string, unknown>;
  description?: string;
  agentId?: string;
}

interface AppState {
  sessions: Map<string, Session>;
  teammates: Map<string, Teammate>;
  tasks: Map<string, TeamTask[]>;
  leadOutputs: Map<string, string>;
  teammateSpecs: TeammateSpec[];
  pendingPermissions: Map<string, PendingPermission>;
  wsSend: ((msg: unknown) => void) | null;
  selectedSessionId: string | null;
  lastError: string | null;
  route: ViewRoute;

  handleServerMessage: (msg: ServerMessage) => void;
  navigate: (route: ViewRoute) => void;
  goBack: () => void;
  patchSession: (id: string, updates: Partial<Session>) => void;
  setTeammateSpecs: (specs: TeammateSpec[]) => void;
  clearError: () => void;
  setWsSend: (send: ((msg: unknown) => void) | null) => void;
  respondToPermission: (requestId: string, behavior: 'allow' | 'deny', message?: string, updatedInput?: Record<string, unknown>) => void;
}

export const useStore = create<AppState>((set, get) => ({
  sessions: new Map(),
  teammates: new Map(),
  tasks: new Map(),
  leadOutputs: new Map(),
  teammateSpecs: [],
  pendingPermissions: new Map(),
  wsSend: null,
  selectedSessionId: null,
  lastError: null,
  route: pathToRoute(window.location.pathname),

  handleServerMessage: (msg: ServerMessage) => {
    switch (msg.type) {
      case 'snapshot': {
        const sessions = new Map(msg.sessions.map(s => [s.id, s]));
        const firstId = msg.sessions[0]?.id ?? null;
        const leadOutputs = new Map(Object.entries(msg.leadOutputs ?? {}));
        set(state => {
          const selectedSessionId = state.selectedSessionId ?? firstId;
          // Only auto-navigate if we're on session_list AND the URL was /
          const route = state.route.view === 'session_list' && selectedSessionId
            ? { view: 'session_detail' as const, sessionId: selectedSessionId, tab: 'output' as const }
            : state.route;
          // Sync URL if route changed
          if (route !== state.route) {
            window.history.replaceState(null, '', routeToPath(route));
          }
          const tasks = new Map(Object.entries(msg.tasks ?? {}));
          return {
            sessions,
            teammates: new Map(msg.teammates.map(t => [t.agentId, t])),
            tasks,
            leadOutputs,
            teammateSpecs: msg.teammateSpecs ?? [],
            selectedSessionId,
            route,
          };
        });
        break;
      }
      case 'session_created': {
        const newRoute: ViewRoute = { view: 'session_detail', sessionId: msg.session.id, tab: 'output' };
        window.history.pushState(null, '', routeToPath(newRoute));
        set(state => {
          const sessions = new Map(state.sessions);
          sessions.set(msg.session.id, msg.session);
          return {
            sessions,
            selectedSessionId: msg.session.id,
            route: newRoute,
          };
        });
        break;
      }
      case 'session_status': {
        set(state => {
          const sessions = new Map(state.sessions);
          const session = sessions.get(msg.sessionId);
          if (session) {
            sessions.set(msg.sessionId, { ...session, status: msg.status });
          }
          return { sessions };
        });
        break;
      }
      case 'session_deleted': {
        set(state => {
          const sessions = new Map(state.sessions);
          sessions.delete(msg.sessionId);
          const teammates = new Map(state.teammates);
          for (const [id, tm] of teammates) {
            if (tm.sessionId === msg.sessionId) teammates.delete(id);
          }
          const tasks = new Map(state.tasks);
          tasks.delete(msg.sessionId);
          const leadOutputs = new Map(state.leadOutputs);
          leadOutputs.delete(msg.sessionId);

          const isViewingDeleted =
            (state.route.view !== 'session_list') &&
            ('sessionId' in state.route) &&
            state.route.sessionId === msg.sessionId;

          const nextSessionId = sessions.keys().next().value ?? null;

          if (isViewingDeleted) {
            const fallback: ViewRoute = { view: 'session_list' };
            window.history.replaceState(null, '', routeToPath(fallback));
          }

          return {
            sessions, teammates, tasks, leadOutputs,
            selectedSessionId: state.selectedSessionId === msg.sessionId ? nextSessionId : state.selectedSessionId,
            route: isViewingDeleted ? { view: 'session_list' } : state.route,
          };
        });
        break;
      }
      case 'lead_output': {
        set(state => {
          const leadOutputs = new Map(state.leadOutputs);
          const existing = leadOutputs.get(msg.sessionId) ?? '';
          leadOutputs.set(msg.sessionId, existing + msg.text);
          return { leadOutputs };
        });
        break;
      }
      case 'teammate_discovered': {
        set(state => {
          const teammates = new Map(state.teammates);
          teammates.set(msg.teammate.agentId, msg.teammate);
          return { teammates };
        });
        break;
      }
      case 'teammate_status': {
        set(state => {
          const teammates = new Map(state.teammates);
          const tm = teammates.get(msg.agentId);
          if (tm) {
            teammates.set(msg.agentId, { ...tm, status: msg.status, name: msg.name ?? tm.name });
          }
          return { teammates };
        });
        break;
      }
      case 'teammate_output': {
        set(state => {
          const teammates = new Map(state.teammates);
          const tm = teammates.get(msg.agentId);
          if (tm) {
            teammates.set(msg.agentId, { ...tm, output: msg.text });
          }
          return { teammates };
        });
        break;
      }
      case 'task_sync': {
        set(state => {
          const tasks = new Map(state.tasks);
          tasks.set(msg.sessionId, msg.tasks);
          return { tasks };
        });
        break;
      }
      case 'task_completed': {
        break;
      }
      case 'cost_update': {
        set(state => {
          const sessions = new Map(state.sessions);
          const session = sessions.get(msg.sessionId);
          if (session) {
            sessions.set(msg.sessionId, {
              ...session,
              costUsd: msg.costUsd,
              inputTokens: msg.inputTokens,
              outputTokens: msg.outputTokens,
            });
          }
          return { sessions };
        });
        break;
      }
      case 'permission_request': {
        set(state => {
          const pendingPermissions = new Map(state.pendingPermissions);
          pendingPermissions.set(msg.requestId, {
            sessionId: msg.sessionId,
            requestId: msg.requestId,
            toolName: msg.toolName,
            input: msg.input,
            description: msg.description,
            agentId: msg.agentId,
          });
          return { pendingPermissions };
        });
        break;
      }
      case 'error': {
        console.error('Server error:', msg.message);
        set({ lastError: msg.message });
        break;
      }
    }
  },

  navigate: (route) => {
    window.history.pushState(null, '', routeToPath(route));
    set({
      route,
      selectedSessionId: 'sessionId' in route ? route.sessionId : get().selectedSessionId,
    });
  },

  goBack: () => set(state => {
    const r = state.route;
    let next: ViewRoute;
    switch (r.view) {
      case 'session_list':
        return {};
      case 'session_detail':
        next = { view: 'session_list' as const };
        break;
      case 'teammate_detail':
        next = { view: 'session_detail' as const, sessionId: r.sessionId, tab: 'teammates' as const };
        break;
      case 'task_detail':
        next = { view: 'session_detail' as const, sessionId: r.sessionId, tab: 'tasks' as const };
        break;
      case 'teammate_spec_list':
        next = { view: 'session_list' as const };
        break;
      case 'teammate_spec_detail':
        next = { view: 'teammate_spec_list' as const };
        break;
    }
    window.history.pushState(null, '', routeToPath(next));
    return { route: next };
  }),

  patchSession: (id, updates) => set(state => {
    const sessions = new Map(state.sessions);
    const session = sessions.get(id);
    if (session) {
      sessions.set(id, { ...session, ...updates });
    }
    return { sessions };
  }),

  setTeammateSpecs: (specs) => set({ teammateSpecs: specs }),

  clearError: () => set({ lastError: null }),

  setWsSend: (send) => set({ wsSend: send }),

  respondToPermission: (requestId, behavior, message, updatedInput) => {
    const { wsSend } = get();
    if (wsSend) {
      wsSend({ type: 'permission_response', requestId, behavior, ...(message ? { message } : {}), ...(updatedInput ? { updatedInput } : {}) });
    }
    set(state => {
      const pendingPermissions = new Map(state.pendingPermissions);
      pendingPermissions.delete(requestId);
      return { pendingPermissions };
    });
  },
}));

// ---- Browser back/forward support ----
window.addEventListener('popstate', () => {
  const route = pathToRoute(window.location.pathname);
  useStore.setState({
    route,
    selectedSessionId: 'sessionId' in route ? route.sessionId : useStore.getState().selectedSessionId,
  });
});
