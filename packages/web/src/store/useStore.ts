import { startTransition } from 'react';
import { create } from 'zustand';
import type { Session, Teammate, TeamTask, TeammateSpec, SkillSpec, PluginSpec, ServerMessage, PermissionLogEntry, PermissionRule } from '@ccgrid/shared';
import { deriveSectionFromRoute, routeToPath, pathToRoute } from './routing';
import { handleServerMessage } from './messageHandlers';

// Re-export routing types for consumers
export type { SessionTab, SidebarSection, ViewRoute } from './routing';

// ---- Store types ----

export interface PendingPermission {
  sessionId: string;
  requestId: string;
  toolName: string;
  input: Record<string, unknown>;
  description?: string;
  agentId?: string;
}

export interface TeammateMessage {
  teammateName: string;
  message: string;
  timestamp: string;
}

export interface PendingQuestion {
  sessionId: string;
  requestId: string;
  question: string;
  agentId?: string;
}

export interface FollowUpImage {
  name: string;
  mimeType: string;
  dataUrl?: string;
}

export interface AppState {
  sessions: Map<string, Session>;
  teammates: Map<string, Teammate>;
  tasks: Map<string, TeamTask[]>;
  leadOutputs: Map<string, string>;
  teammateMessages: Map<string, TeammateMessage[]>;
  followUpImages: Map<string, Map<number, FollowUpImage[]>>;
  teammateSpecs: TeammateSpec[];
  skillSpecs: SkillSpec[];
  plugins: PluginSpec[];
  pendingPermissions: Map<string, PendingPermission>;
  pendingQuestions: Map<string, PendingQuestion>;
  permissionHistory: Map<string, PermissionLogEntry[]>;
  permissionRules: PermissionRule[];
  toasts: { id: string; message: string; type: 'success' | 'info' }[];
  wsSend: ((msg: unknown) => void) | null;
  selectedSessionId: string | null;
  lastError: string | null;
  route: import('./routing').ViewRoute;
  activeSection: import('./routing').SidebarSection;

  handleServerMessage: (msg: ServerMessage) => void;
  navigate: (route: import('./routing').ViewRoute) => void;
  goBack: () => void;
  setActiveSection: (section: import('./routing').SidebarSection) => void;
  patchSession: (id: string, updates: Partial<Session>) => void;
  setTeammateSpecs: (specs: TeammateSpec[]) => void;
  setSkillSpecs: (specs: SkillSpec[]) => void;
  setPlugins: (plugins: PluginSpec[]) => void;
  clearError: () => void;
  setWsSend: (send: ((msg: unknown) => void) | null) => void;
  respondToPermission: (requestId: string, behavior: 'allow' | 'deny', message?: string, updatedInput?: Record<string, unknown>) => void;
  respondToQuestion: (requestId: string, answer: string) => void;
  pushFollowUpImages: (sessionId: string, followUpIndex: number, images: FollowUpImage[]) => void;
  addToast: (message: string, type?: 'success' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  sessions: new Map(),
  teammates: new Map(),
  tasks: new Map(),
  leadOutputs: new Map(),
  teammateMessages: new Map(),
  followUpImages: new Map(),
  teammateSpecs: [],
  skillSpecs: [],
  plugins: [],
  pendingPermissions: new Map(),
  pendingQuestions: new Map(),
  permissionHistory: new Map(),
  permissionRules: [],
  toasts: [],
  wsSend: null,
  selectedSessionId: null,
  lastError: null,
  route: pathToRoute(window.location.pathname),
  activeSection: deriveSectionFromRoute(pathToRoute(window.location.pathname)),

  handleServerMessage: (msg: ServerMessage) => {
    handleServerMessage(msg, get, set);
  },

  navigate: (route) => {
    window.history.pushState(null, '', routeToPath(route));
    set({
      activeSection: deriveSectionFromRoute(route),
      selectedSessionId: 'sessionId' in route ? route.sessionId : get().selectedSessionId,
    });
    startTransition(() => {
      set({ route });
    });
  },

  goBack: () => set(state => {
    const r = state.route;
    let next: import('./routing').ViewRoute;
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
      case 'skill_spec_list':
        next = { view: 'session_list' as const };
        break;
      case 'skill_spec_detail':
        next = { view: 'skill_spec_list' as const };
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

  setActiveSection: (section) => set({ activeSection: section }),

  setTeammateSpecs: (specs) => set({ teammateSpecs: specs }),

  setSkillSpecs: (specs) => set({ skillSpecs: specs }),

  setPlugins: (plugins) => set({ plugins }),

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

  respondToQuestion: (requestId, answer) => {
    const { wsSend } = get();
    if (wsSend) {
      wsSend({ type: 'user_question_response', requestId, answer });
    }
    set(state => {
      const pendingQuestions = new Map(state.pendingQuestions);
      pendingQuestions.delete(requestId);
      return { pendingQuestions };
    });
  },

  addToast: (message, type = 'info') => {
    const id = crypto.randomUUID();
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 3000);
  },

  removeToast: (id) => set(state => {
    const filtered = state.toasts.filter(t => t.id !== id);
    if (filtered.length === state.toasts.length) return state;
    return { toasts: filtered };
  }),

  pushFollowUpImages: (sessionId, followUpIndex, images) => set(state => {
    const followUpImages = new Map(state.followUpImages);
    const indexMap = new Map(followUpImages.get(sessionId) ?? []);
    indexMap.set(followUpIndex, images);
    followUpImages.set(sessionId, indexMap);
    return { followUpImages };
  }),
}));

// ---- Browser back/forward support ----
window.addEventListener('popstate', () => {
  const route = pathToRoute(window.location.pathname);
  useStore.setState({
    route,
    activeSection: deriveSectionFromRoute(route),
    selectedSessionId: 'sessionId' in route ? route.sessionId : useStore.getState().selectedSessionId,
  });
});
