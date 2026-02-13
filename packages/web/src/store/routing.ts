// ---- Navigation types & path conversion ----

export type SessionTab = 'output' | 'teammates' | 'tasks' | 'overview';
export type SidebarSection = 'sessions' | 'teammates' | 'skills';

export type ViewRoute =
  | { view: 'session_list' }
  | { view: 'session_detail'; sessionId: string; tab: SessionTab }
  | { view: 'teammate_detail'; sessionId: string; agentId: string }
  | { view: 'task_detail'; sessionId: string; taskId: string }
  | { view: 'teammate_spec_list' }
  | { view: 'teammate_spec_detail'; specId: string }
  | { view: 'skill_spec_list' }
  | { view: 'skill_spec_detail'; specId: string };

export function deriveSectionFromRoute(route: ViewRoute): SidebarSection {
  switch (route.view) {
    case 'session_list':
    case 'session_detail':
    case 'teammate_detail':
    case 'task_detail':
      return 'sessions';
    case 'teammate_spec_list':
    case 'teammate_spec_detail':
      return 'teammates';
    case 'skill_spec_list':
    case 'skill_spec_detail':
      return 'skills';
  }
}

const SESSION_TABS = new Set<string>(['output', 'teammates', 'tasks', 'overview']);

export function routeToPath(route: ViewRoute): string {
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
      return '/teammate-specs';
    case 'teammate_spec_detail':
      return `/teammate-specs/${route.specId}`;
    case 'skill_spec_list':
      return '/skill-specs';
    case 'skill_spec_detail':
      return `/skill-specs/${route.specId}`;
  }
}

type RouteMatcher = (parts: string[]) => ViewRoute | null;

const ROUTE_MATCHERS: RouteMatcher[] = [
  (p) => p[0] === 'teammate-specs' && p[1] ? { view: 'teammate_spec_detail', specId: p[1] } : null,
  (p) => p[0] === 'teammate-specs' ? { view: 'teammate_spec_list' } : null,
  (p) => p[0] === 'skill-specs' && p[1] ? { view: 'skill_spec_detail', specId: p[1] } : null,
  (p) => p[0] === 'skill-specs' ? { view: 'skill_spec_list' } : null,
  (p) => p[0] === 'sessions' && p[1] && p[2] === 'teammates' && p[3] ? { view: 'teammate_detail', sessionId: p[1], agentId: p[3] } : null,
  (p) => p[0] === 'sessions' && p[1] && p[2] === 'tasks' && p[3] ? { view: 'task_detail', sessionId: p[1], taskId: p[3] } : null,
  (p) => p[0] === 'sessions' && p[1] ? { view: 'session_detail', sessionId: p[1], tab: (SESSION_TABS.has(p[2] ?? '') ? p[2] as SessionTab : 'output') } : null,
];

export function pathToRoute(pathname: string): ViewRoute {
  const parts = pathname.split('/').filter(Boolean);
  for (const matcher of ROUTE_MATCHERS) {
    const route = matcher(parts);
    if (route) return route;
  }
  return { view: 'session_list' };
}
