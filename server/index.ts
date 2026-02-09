import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { SessionManager } from './session-manager.js';
import { loadTeammateSpecs, saveTeammateSpecs } from './state-store.js';
import type { ServerMessage, TeammateSpec } from '../shared/types.js';

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

const PORT = 3001;

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

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

// ---- WebSocket: event stream only ----

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
  };
  ws.send(JSON.stringify(snapshot));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'permission_response') {
        sm.resolvePermission(msg.requestId, msg.behavior, msg.message);
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

// ---- REST: Sessions CRUD ----

app.post('/api/sessions', async (req, res) => {
  const { name, cwd, model, teammateSpecs, maxBudgetUsd, taskDescription, permissionMode } = req.body;
  if (!name || !cwd || !model || !taskDescription) {
    return res.status(400).json({ error: 'name, cwd, model, taskDescription are required' });
  }
  try {
    const session = await sm.createSession(name, cwd, model, teammateSpecs, maxBudgetUsd, taskDescription, permissionMode);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/sessions', (_req, res) => {
  res.json(sm.getSessions());
});

app.get('/api/sessions/:id', (req, res) => {
  const session = sm.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

app.patch('/api/sessions/:id', (req, res) => {
  const session = sm.updateSession(req.params.id, req.body);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

app.delete('/api/sessions/:id', async (req, res) => {
  await sm.deleteSession(req.params.id);
  res.status(204).end();
});

// Stop a running session (without deleting)
app.post('/api/sessions/:id/stop', async (req, res) => {
  const session = sm.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  await sm.stopSession(req.params.id);
  res.json(sm.getSession(req.params.id));
});

// Continue a completed session with a follow-up prompt
app.post('/api/sessions/:id/continue', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  const session = sm.continueSession(req.params.id, prompt);
  if (!session) return res.status(404).json({ error: 'Session not found or not completed' });
  res.json(session);
});

// ---- REST: Teammates (read-only sub-resource) ----

app.get('/api/sessions/:id/teammates', (req, res) => {
  const session = sm.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(sm.getTeammates(req.params.id));
});

app.get('/api/sessions/:id/teammates/:agentId', (req, res) => {
  const tm = sm.getTeammate(req.params.agentId);
  if (!tm || tm.sessionId !== req.params.id) return res.status(404).json({ error: 'Teammate not found' });
  res.json(tm);
});

// ---- REST: Tasks (read-only sub-resource) ----

app.get('/api/sessions/:id/tasks', (req, res) => {
  const session = sm.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(sm.getTasks(req.params.id));
});

// ---- REST: Lead Output (read-only sub-resource) ----

app.get('/api/sessions/:id/output', (req, res) => {
  const session = sm.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ output: sm.getLeadOutput(req.params.id) });
});

// ---- REST: Teammate Specs CRUD ----

app.get('/api/teammate-specs', (_req, res) => {
  res.json(teammateSpecs);
});

app.post('/api/teammate-specs', (req, res) => {
  const { name, role, instructions } = req.body;
  if (!name || !role) {
    return res.status(400).json({ error: 'name and role are required' });
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
  res.status(201).json(spec);
});

app.patch('/api/teammate-specs/:id', (req, res) => {
  const idx = teammateSpecs.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Spec not found' });
  const { name, role, instructions } = req.body;
  if (name !== undefined) teammateSpecs[idx].name = name;
  if (role !== undefined) teammateSpecs[idx].role = role;
  if (instructions !== undefined) teammateSpecs[idx].instructions = instructions || undefined;
  saveTeammateSpecs(teammateSpecs);
  res.json(teammateSpecs[idx]);
});

app.delete('/api/teammate-specs/:id', (req, res) => {
  const idx = teammateSpecs.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Spec not found' });
  teammateSpecs.splice(idx, 1);
  saveTeammateSpecs(teammateSpecs);
  res.status(204).end();
});

// ---- REST: Utilities ----

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/dirs', async (req, res) => {
  const requestedPath = (req.query.path as string) || os.homedir();
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
    res.json({ current: requestedPath, parent: join(requestedPath, '..'), dirs });
  } catch {
    res.status(400).json({ error: 'Cannot read directory' });
  }
});

app.get('/api/dirs/validate', async (req, res) => {
  const requestedPath = req.query.path as string;
  if (!requestedPath) return res.json({ valid: false });
  try {
    const s = await stat(requestedPath);
    res.json({ valid: s.isDirectory(), path: requestedPath });
  } catch {
    res.json({ valid: false });
  }
});

server.listen(PORT, () => {
  console.log(`ccgrid server running on http://localhost:${PORT}`);
});
