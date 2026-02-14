import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { WebSocketServer, WebSocket, type ServerOptions } from 'ws';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import os from 'os';
import { SessionManager } from './session-manager.js';
import { getUsage } from './usage-tracker.js';
import { loadTeammateSpecs, loadSkillSpecs, loadPermissionRules, loadPlugins } from './state-store.js';
import { sessionRoutes } from './routes/sessions.js';
import { specsRoutes } from './routes/specs.js';
import { pluginRoutes } from './routes/plugins.js';
import type { ServerMessage } from '@ccgrid/shared';

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

const PORT = 7819;

const app = new Hono();

const clients = new Set<WebSocket>();

function broadcast(message: ServerMessage): void {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

const sm = new SessionManager(broadcast);
const specsState = {
  teammateSpecs: loadTeammateSpecs(),
  skillSpecs: loadSkillSpecs(),
  permissionRules: loadPermissionRules(),
  plugins: loadPlugins(),
};

// ---- Routes ----

app.route('/api/sessions', sessionRoutes(sm, () => specsState.skillSpecs));
app.route('/api', specsRoutes(specsState, broadcast));
app.route('/api', pluginRoutes(specsState, broadcast));

// ---- REST: Utilities ----

app.get('/api/usage', async (c) => {
  const data = await getUsage();
  return c.json(data);
});

app.get('/api/health', (c) => {
  return c.json({ status: 'ok' });
});

app.get('/api/dirs', async (c) => {
  const requestedPath = c.req.query('path') || os.homedir();
  try {
    const names = await readdir(requestedPath);
    const visible = names.filter(n => !n.startsWith('.'));
    const checks = await Promise.all(
      visible.map(async (name) => {
        try {
          const s = await stat(join(requestedPath, name));
          return s.isDirectory() ? name : null;
        } catch { return null; }
      })
    );
    const dirs = checks
      .filter((n): n is string => n !== null)
      .sort((a, b) => a.localeCompare(b))
      .map(name => ({ name, path: join(requestedPath, name) }));
    return c.json({ current: requestedPath, parent: join(requestedPath, '..'), dirs });
  } catch {
    return c.json({ error: 'Cannot read directory' }, 400);
  }
});

app.get('/api/dirs/validate', async (c) => {
  const requestedPath = c.req.query('path');
  if (!requestedPath) return c.json({ valid: false });
  try {
    const s = await stat(requestedPath);
    return c.json({ valid: s.isDirectory(), path: requestedPath });
  } catch {
    return c.json({ valid: false });
  }
});

// ---- Start server ----

const server = serve({ fetch: app.fetch, port: PORT });

// ---- WebSocket: event stream only ----

const wss = new WebSocketServer({ server: server as ServerOptions['server'], path: '/ws' });

wss.on('connection', (ws) => {
  clients.add(ws);

  const snapshot: ServerMessage = {
    type: 'snapshot',
    sessions: sm.getSessions(),
    teammates: sm.getTeammates(),
    tasks: sm.getAllTasks(),
    leadOutputs: sm.getLeadOutputs(),
    teammateSpecs: specsState.teammateSpecs,
    skillSpecs: specsState.skillSpecs,
    plugins: specsState.plugins,
    permissionRules: specsState.permissionRules,
  };
  ws.send(JSON.stringify(snapshot));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'permission_response') {
        sm.resolvePermission(msg.requestId, msg.behavior, msg.message, msg.updatedInput);
      } else if (msg.type === 'teammate_message') {
        sm.sendToTeammate(msg.sessionId, msg.teammateName, msg.message);
      }
    } catch { /* ignore malformed messages */ }
  });

  ws.on('close', () => clients.delete(ws));
  ws.on('pong', () => { void 0; });
});

setInterval(() => {
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    }
  }
}, 30000);

console.log(`ccgrid server running on http://localhost:${PORT}`);
