import { Hono } from 'hono';
import type { SessionManager } from '../session-manager.js';
import type { SkillSpec } from '@ccgrid/shared';

export function sessionRoutes(sm: SessionManager, getSkillSpecs: () => SkillSpec[]) {
  const app = new Hono();

  app.post('/', async (c) => {
    const { name, cwd, model, teammateSpecs, maxBudgetUsd, taskDescription, permissionMode, customInstructions, files } = await c.req.json();
    if (!name || !cwd || !model || !taskDescription) {
      return c.json({ error: 'name, cwd, model, taskDescription are required' }, 400);
    }
    try {
      const session = await sm.createSession(name, cwd, model, teammateSpecs, maxBudgetUsd, taskDescription, permissionMode, getSkillSpecs(), customInstructions, files);
      return c.json(session, 201);
    } catch (err) {
      return c.json({ error: String(err) }, 500);
    }
  });

  app.get('/', (c) => {
    return c.json(sm.getSessions());
  });

  app.get('/:id', (c) => {
    const session = sm.getSession(c.req.param('id'));
    if (!session) return c.json({ error: 'Session not found' }, 404);
    return c.json(session);
  });

  app.patch('/:id', async (c) => {
    const body = await c.req.json();
    const session = sm.updateSession(c.req.param('id'), body);
    if (!session) return c.json({ error: 'Session not found' }, 404);
    return c.json(session);
  });

  app.delete('/:id', async (c) => {
    await sm.deleteSession(c.req.param('id'));
    return c.body(null, 204);
  });

  app.post('/:id/stop', async (c) => {
    const id = c.req.param('id');
    const session = sm.getSession(id);
    if (!session) return c.json({ error: 'Session not found' }, 404);
    await sm.stopSession(id);
    return c.json(sm.getSession(id));
  });

  app.post('/:id/continue', async (c) => {
    const { prompt, files } = await c.req.json();
    if (!prompt) return c.json({ error: 'prompt required' }, 400);
    const session = sm.continueSession(c.req.param('id'), prompt, files);
    if (!session) return c.json({ error: 'Session not found or not completed' }, 404);
    return c.json(session);
  });

  app.post('/:id/teammates/:name/message', async (c) => {
    const id = c.req.param('id');
    const name = c.req.param('name');
    const { message } = await c.req.json();
    if (!message) return c.json({ error: 'message required' }, 400);
    const session = sm.sendToTeammate(id, name, message);
    if (!session) return c.json({ error: 'Session not found or not in valid state' }, 404);
    return c.json(session);
  });

  app.get('/:id/teammates', (c) => {
    const id = c.req.param('id');
    const session = sm.getSession(id);
    if (!session) return c.json({ error: 'Session not found' }, 404);
    return c.json(sm.getTeammates(id));
  });

  app.get('/:id/teammates/:agentId', (c) => {
    const tm = sm.getTeammate(c.req.param('agentId'));
    if (!tm || tm.sessionId !== c.req.param('id')) return c.json({ error: 'Teammate not found' }, 404);
    return c.json(tm);
  });

  app.get('/:id/tasks', (c) => {
    const session = sm.getSession(c.req.param('id'));
    if (!session) return c.json({ error: 'Session not found' }, 404);
    return c.json(sm.getTasks(c.req.param('id')));
  });

  app.get('/:id/output', (c) => {
    const id = c.req.param('id');
    const session = sm.getSession(id);
    if (!session) return c.json({ error: 'Session not found' }, 404);
    return c.json({ output: sm.getLeadOutput(id) });
  });

  return app;
}
