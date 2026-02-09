import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { WebSocketServer, WebSocket, type ServerOptions } from 'ws';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { SessionManager } from './session-manager.js';
import { loadTeammateSpecs, saveTeammateSpecs, loadSkillSpecs, saveSkillSpecs } from './state-store.js';
import type { ServerMessage, TeammateSpec, SkillSpec } from '@ccgrid/shared';

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
let teammateSpecs: TeammateSpec[] = loadTeammateSpecs();
let skillSpecs: SkillSpec[] = loadSkillSpecs();

// ---- REST: Sessions CRUD ----

app.post('/api/sessions', async (c) => {
  const { name, cwd, model, teammateSpecs, maxBudgetUsd, taskDescription, permissionMode } = await c.req.json();
  if (!name || !cwd || !model || !taskDescription) {
    return c.json({ error: 'name, cwd, model, taskDescription are required' }, 400);
  }
  try {
    const session = await sm.createSession(name, cwd, model, teammateSpecs, maxBudgetUsd, taskDescription, permissionMode, skillSpecs);
    return c.json(session, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.get('/api/sessions', (c) => {
  return c.json(sm.getSessions());
});

app.get('/api/sessions/:id', (c) => {
  const session = sm.getSession(c.req.param('id'));
  if (!session) return c.json({ error: 'Session not found' }, 404);
  return c.json(session);
});

app.patch('/api/sessions/:id', async (c) => {
  const body = await c.req.json();
  const session = sm.updateSession(c.req.param('id'), body);
  if (!session) return c.json({ error: 'Session not found' }, 404);
  return c.json(session);
});

app.delete('/api/sessions/:id', async (c) => {
  await sm.deleteSession(c.req.param('id'));
  return c.body(null, 204);
});

// Stop a running session (without deleting)
app.post('/api/sessions/:id/stop', async (c) => {
  const id = c.req.param('id');
  const session = sm.getSession(id);
  if (!session) return c.json({ error: 'Session not found' }, 404);
  await sm.stopSession(id);
  return c.json(sm.getSession(id));
});

// Continue a completed session with a follow-up prompt
app.post('/api/sessions/:id/continue', async (c) => {
  const { prompt } = await c.req.json();
  if (!prompt) return c.json({ error: 'prompt required' }, 400);
  const session = sm.continueSession(c.req.param('id'), prompt);
  if (!session) return c.json({ error: 'Session not found or not completed' }, 404);
  return c.json(session);
});

// ---- REST: Teammates (read-only sub-resource) ----

app.get('/api/sessions/:id/teammates', (c) => {
  const id = c.req.param('id');
  const session = sm.getSession(id);
  if (!session) return c.json({ error: 'Session not found' }, 404);
  return c.json(sm.getTeammates(id));
});

app.get('/api/sessions/:id/teammates/:agentId', (c) => {
  const tm = sm.getTeammate(c.req.param('agentId'));
  if (!tm || tm.sessionId !== c.req.param('id')) return c.json({ error: 'Teammate not found' }, 404);
  return c.json(tm);
});

// ---- REST: Tasks (read-only sub-resource) ----

app.get('/api/sessions/:id/tasks', (c) => {
  const session = sm.getSession(c.req.param('id'));
  if (!session) return c.json({ error: 'Session not found' }, 404);
  return c.json(sm.getTasks(c.req.param('id')));
});

// ---- REST: Lead Output (read-only sub-resource) ----

app.get('/api/sessions/:id/output', (c) => {
  const id = c.req.param('id');
  const session = sm.getSession(id);
  if (!session) return c.json({ error: 'Session not found' }, 404);
  return c.json({ output: sm.getLeadOutput(id) });
});

// ---- REST: Teammate Specs CRUD ----

app.get('/api/teammate-specs', (c) => {
  return c.json(teammateSpecs);
});

app.post('/api/teammate-specs', async (c) => {
  const { name, role, instructions } = await c.req.json();
  if (!name || !role) {
    return c.json({ error: 'name and role are required' }, 400);
  }
  const spec: TeammateSpec = {
    id: randomUUID(),
    name,
    role,
    instructions: instructions || undefined,
    createdAt: new Date().toISOString(),
  };
  teammateSpecs.push(spec);
  saveTeammateSpecs(teammateSpecs);
  return c.json(spec, 201);
});

app.patch('/api/teammate-specs/:id', async (c) => {
  const idx = teammateSpecs.findIndex(s => s.id === c.req.param('id'));
  if (idx === -1) return c.json({ error: 'Spec not found' }, 404);
  const { name, role, instructions, skillIds } = await c.req.json();
  if (name !== undefined) teammateSpecs[idx].name = name;
  if (role !== undefined) teammateSpecs[idx].role = role;
  if (instructions !== undefined) teammateSpecs[idx].instructions = instructions || undefined;
  if (skillIds !== undefined) teammateSpecs[idx].skillIds = skillIds;
  saveTeammateSpecs(teammateSpecs);
  return c.json(teammateSpecs[idx]);
});

app.delete('/api/teammate-specs/:id', (c) => {
  const idx = teammateSpecs.findIndex(s => s.id === c.req.param('id'));
  if (idx === -1) return c.json({ error: 'Spec not found' }, 404);
  teammateSpecs.splice(idx, 1);
  saveTeammateSpecs(teammateSpecs);
  return c.body(null, 204);
});

// ---- REST: Skill Specs CRUD ----

app.get('/api/skill-specs', (c) => {
  return c.json(skillSpecs);
});

app.post('/api/skill-specs', async (c) => {
  const { name, description, skillType } = await c.req.json();
  if (!name || !description) {
    return c.json({ error: 'name and description are required' }, 400);
  }
  const spec: SkillSpec = {
    id: randomUUID(),
    name,
    description,
    skillType: skillType ?? 'internal',
    createdAt: new Date().toISOString(),
  };
  skillSpecs.push(spec);
  saveSkillSpecs(skillSpecs);
  return c.json(spec, 201);
});

app.patch('/api/skill-specs/:id', async (c) => {
  const idx = skillSpecs.findIndex(s => s.id === c.req.param('id'));
  if (idx === -1) return c.json({ error: 'Skill spec not found' }, 404);
  const { name, description, skillType } = await c.req.json();
  if (name !== undefined) skillSpecs[idx].name = name;
  if (description !== undefined) skillSpecs[idx].description = description;
  if (skillType !== undefined) skillSpecs[idx].skillType = skillType;
  saveSkillSpecs(skillSpecs);
  return c.json(skillSpecs[idx]);
});

app.delete('/api/skill-specs/:id', (c) => {
  const idx = skillSpecs.findIndex(s => s.id === c.req.param('id'));
  if (idx === -1) return c.json({ error: 'Skill spec not found' }, 404);
  skillSpecs.splice(idx, 1);
  saveSkillSpecs(skillSpecs);
  return c.body(null, 204);
});

// ---- REST: Utilities ----

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

  // Send initial snapshot
  const snapshot: ServerMessage = {
    type: 'snapshot',
    sessions: sm.getSessions(),
    teammates: sm.getTeammates(),
    tasks: sm.getAllTasks(),
    leadOutputs: sm.getLeadOutputs(),
    teammateSpecs,
    skillSpecs,
  };
  ws.send(JSON.stringify(snapshot));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'permission_response') {
        sm.resolvePermission(msg.requestId, msg.behavior, msg.message, msg.updatedInput);
      }
    } catch { /* ignore malformed messages */ }
  });

  ws.on('close', () => clients.delete(ws));
  ws.on('pong', () => { /* alive */ });
});

// Ping clients every 30s to detect dead connections
setInterval(() => {
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    }
  }
}, 30000);

console.log(`ccgrid server running on http://localhost:${PORT}`);
