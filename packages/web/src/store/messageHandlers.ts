import type { ServerMessage, Session, Teammate, TeamTask } from '@ccgrid/shared';
import type { ViewRoute, SidebarSection } from './routing';
import { deriveSectionFromRoute, routeToPath } from './routing';
import type { AppState } from './useStore';

type StateGetter = () => AppState;
type StateSetter = (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void;

export function handleServerMessage(msg: ServerMessage, get: StateGetter, set: StateSetter): void {
  const handler = MESSAGE_HANDLERS[msg.type];
  if (handler) handler(msg as never, get, set);
}

type MsgOf<T extends ServerMessage['type']> = Extract<ServerMessage, { type: T }>;
type Handler<T extends ServerMessage['type']> = (msg: MsgOf<T>, get: StateGetter, set: StateSetter) => void;

const MESSAGE_HANDLERS: { [K in ServerMessage['type']]?: Handler<K> } = {
  snapshot: handleSnapshot,
  session_created: handleSessionCreated,
  session_status: handleSessionStatus,
  session_deleted: handleSessionDeleted,
  lead_output: handleLeadOutput,
  teammate_discovered: handleTeammateDiscovered,
  teammate_status: handleTeammateStatus,
  teammate_output: handleTeammateOutput,
  task_sync: handleTaskSync,
  task_completed: handleTaskCompleted,
  cost_update: handleCostUpdate,
  permission_request: handlePermissionRequest,
  teammate_message_relayed: handleTeammateMessageRelayed,
  permission_resolved: handlePermissionResolved,
  permission_rules_updated: handlePermissionRulesUpdated,
  error: handleError,
};

function handleSnapshot(msg: MsgOf<'snapshot'>, _get: StateGetter, set: StateSetter): void {
  const sessions = new Map<string, Session>(msg.sessions.map((s) => [s.id, s]));
  const firstId = msg.sessions[0]?.id ?? null;
  const leadOutputs = new Map<string, string>(Object.entries(msg.leadOutputs ?? {}));
  set(state => {
    const selectedSessionId = state.selectedSessionId ?? firstId;
    const route = state.route.view === 'session_list' && selectedSessionId
      ? { view: 'session_detail' as const, sessionId: selectedSessionId, tab: 'output' as const }
      : state.route;
    if (route !== state.route) {
      window.history.replaceState(null, '', routeToPath(route));
    }
    const tasks = new Map<string, TeamTask[]>(Object.entries(msg.tasks ?? {}));
    return {
      sessions,
      teammates: new Map<string, Teammate>(msg.teammates.map((t) => [t.agentId, t])),
      tasks,
      leadOutputs,
      teammateSpecs: msg.teammateSpecs ?? [],
      skillSpecs: msg.skillSpecs ?? [],
      plugins: msg.plugins ?? [],
      permissionRules: msg.permissionRules ?? [],
      selectedSessionId,
      route,
      activeSection: deriveSectionFromRoute(route),
    };
  });
}

function handleSessionCreated(msg: MsgOf<'session_created'>, _get: StateGetter, set: StateSetter): void {
  const newRoute: ViewRoute = { view: 'session_detail', sessionId: msg.session.id, tab: 'output' };
  window.history.pushState(null, '', routeToPath(newRoute));
  set(state => {
    const sessions = new Map(state.sessions);
    sessions.set(msg.session.id, msg.session);
    return {
      sessions,
      selectedSessionId: msg.session.id,
      route: newRoute,
      activeSection: 'sessions' as SidebarSection,
    };
  });
}

function handleSessionStatus(msg: MsgOf<'session_status'>, _get: StateGetter, set: StateSetter): void {
  set(state => {
    const sessions = new Map(state.sessions);
    const session = sessions.get(msg.sessionId);
    if (session) {
      sessions.set(msg.sessionId, { ...session, status: msg.status });
    }
    return { sessions };
  });
}

function handleSessionDeleted(msg: MsgOf<'session_deleted'>, _get: StateGetter, set: StateSetter): void {
  set(state => {
    const sessions = new Map(state.sessions);
    sessions.delete(msg.sessionId);
    const teammates = new Map(state.teammates);
    for (const [, tm] of teammates) {
      if (tm.sessionId === msg.sessionId) teammates.delete(tm.agentId);
    }
    const tasks = new Map(state.tasks);
    tasks.delete(msg.sessionId);
    const leadOutputs = new Map(state.leadOutputs);
    leadOutputs.delete(msg.sessionId);
    const teammateMessages = new Map(state.teammateMessages);
    teammateMessages.delete(msg.sessionId);

    const isViewingDeleted =
      (state.route.view !== 'session_list') &&
      ('sessionId' in state.route) &&
      state.route.sessionId === msg.sessionId;

    const nextSessionId = sessions.keys().next().value ?? null;

    if (isViewingDeleted) {
      window.history.replaceState(null, '', routeToPath({ view: 'session_list' }));
    }

    return {
      sessions, teammates, tasks, leadOutputs, teammateMessages,
      selectedSessionId: state.selectedSessionId === msg.sessionId ? nextSessionId : state.selectedSessionId,
      route: isViewingDeleted ? { view: 'session_list' } : state.route,
    };
  });
}

function handleLeadOutput(msg: MsgOf<'lead_output'>, _get: StateGetter, set: StateSetter): void {
  set(state => {
    const leadOutputs = new Map(state.leadOutputs);
    const existing = leadOutputs.get(msg.sessionId) ?? '';
    leadOutputs.set(msg.sessionId, existing + msg.text);
    return { leadOutputs };
  });
}

function handleTeammateDiscovered(msg: MsgOf<'teammate_discovered'>, _get: StateGetter, set: StateSetter): void {
  set(state => {
    const teammates = new Map(state.teammates);
    teammates.set(msg.teammate.agentId, msg.teammate);
    return { teammates };
  });
}

function handleTeammateStatus(msg: MsgOf<'teammate_status'>, _get: StateGetter, set: StateSetter): void {
  set(state => {
    const teammates = new Map(state.teammates);
    const tm = teammates.get(msg.agentId);
    if (tm) {
      teammates.set(msg.agentId, { ...tm, status: msg.status, name: msg.name ?? tm.name });
    }
    return { teammates };
  });
}

function handleTeammateOutput(msg: MsgOf<'teammate_output'>, _get: StateGetter, set: StateSetter): void {
  set(state => {
    const teammates = new Map(state.teammates);
    const tm = teammates.get(msg.agentId);
    if (tm) {
      teammates.set(msg.agentId, { ...tm, output: msg.text });
    }
    return { teammates };
  });
}

function handleTaskSync(msg: MsgOf<'task_sync'>, _get: StateGetter, set: StateSetter): void {
  set(state => {
    const tasks = new Map(state.tasks);
    tasks.set(msg.sessionId, msg.tasks);
    return { tasks };
  });
}

function handleTaskCompleted(msg: MsgOf<'task_completed'>, get: StateGetter, _set: StateSetter): void {
  const label = msg.teammateName
    ? `${msg.teammateName}: ${msg.taskSubject}`
    : msg.taskSubject;
  get().addToast(`Task completed — ${label}`, 'success');
}

function handleCostUpdate(msg: MsgOf<'cost_update'>, _get: StateGetter, set: StateSetter): void {
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
}

function handlePermissionRequest(msg: MsgOf<'permission_request'>, _get: StateGetter, set: StateSetter): void {
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
}

function handleTeammateMessageRelayed(msg: MsgOf<'teammate_message_relayed'>, _get: StateGetter, set: StateSetter): void {
  set(state => {
    const teammateMessages = new Map(state.teammateMessages);
    const existing = teammateMessages.get(msg.sessionId) ?? [];
    teammateMessages.set(msg.sessionId, [...existing, {
      teammateName: msg.teammateName,
      message: msg.message,
      timestamp: new Date().toISOString(),
    }]);
    return { teammateMessages };
  });
}

function handlePermissionResolved(msg: MsgOf<'permission_resolved'>, _get: StateGetter, set: StateSetter): void {
  set(state => {
    const permissionHistory = new Map(state.permissionHistory);
    const existing = permissionHistory.get(msg.entry.sessionId) ?? [];
    permissionHistory.set(msg.entry.sessionId, [...existing, msg.entry]);
    return { permissionHistory };
  });
}

function handlePermissionRulesUpdated(msg: MsgOf<'permission_rules_updated'>, _get: StateGetter, set: StateSetter): void {
  set({ permissionRules: msg.rules });
}

function handleError(msg: MsgOf<'error'>, _get: StateGetter, set: StateSetter): void {
  console.error('Server error:', msg.message);
  set({ lastError: msg.message });
}
