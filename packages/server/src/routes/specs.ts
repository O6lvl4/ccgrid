import { Hono } from 'hono';
import { randomUUID } from 'crypto';
import { saveTeammateSpecs, saveSkillSpecs, savePermissionRules } from '../state-store.js';
import type { ServerMessage, TeammateSpec, SkillSpec, PermissionRule } from '@ccgrid/shared';

interface SpecsState {
  teammateSpecs: TeammateSpec[];
  skillSpecs: SkillSpec[];
  permissionRules: PermissionRule[];
}

export function specsRoutes(state: SpecsState, broadcast: (msg: ServerMessage) => void) {
  const app = new Hono();

  // ---- Teammate Specs ----

  app.get('/teammate-specs', (c) => {
    return c.json(state.teammateSpecs);
  });

  app.post('/teammate-specs', async (c) => {
    const { name, role, instructions, skillIds } = await c.req.json();
    if (!name || !role) {
      return c.json({ error: 'name and role are required' }, 400);
    }
    const spec: TeammateSpec = {
      id: randomUUID(),
      name,
      role,
      instructions: instructions || undefined,
      skillIds: Array.isArray(skillIds) && skillIds.length > 0 ? skillIds : undefined,
      createdAt: new Date().toISOString(),
    };
    state.teammateSpecs.push(spec);
    saveTeammateSpecs(state.teammateSpecs);
    return c.json(spec, 201);
  });

  app.patch('/teammate-specs/:id', async (c) => {
    const idx = state.teammateSpecs.findIndex(s => s.id === c.req.param('id'));
    if (idx === -1) return c.json({ error: 'Spec not found' }, 404);
    const { name, role, instructions, skillIds } = await c.req.json();
    if (name !== undefined) state.teammateSpecs[idx].name = name;
    if (role !== undefined) state.teammateSpecs[idx].role = role;
    if (instructions !== undefined) state.teammateSpecs[idx].instructions = instructions || undefined;
    if (skillIds !== undefined) state.teammateSpecs[idx].skillIds = skillIds;
    saveTeammateSpecs(state.teammateSpecs);
    return c.json(state.teammateSpecs[idx]);
  });

  app.delete('/teammate-specs/:id', (c) => {
    const idx = state.teammateSpecs.findIndex(s => s.id === c.req.param('id'));
    if (idx === -1) return c.json({ error: 'Spec not found' }, 404);
    state.teammateSpecs.splice(idx, 1);
    saveTeammateSpecs(state.teammateSpecs);
    return c.body(null, 204);
  });

  // ---- Skill Specs ----

  app.get('/skill-specs', (c) => {
    return c.json(state.skillSpecs);
  });

  app.post('/skill-specs', async (c) => {
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
    state.skillSpecs.push(spec);
    saveSkillSpecs(state.skillSpecs);
    return c.json(spec, 201);
  });

  app.patch('/skill-specs/:id', async (c) => {
    const idx = state.skillSpecs.findIndex(s => s.id === c.req.param('id'));
    if (idx === -1) return c.json({ error: 'Skill spec not found' }, 404);
    const { name, description, skillType } = await c.req.json();
    if (name !== undefined) state.skillSpecs[idx].name = name;
    if (description !== undefined) state.skillSpecs[idx].description = description;
    if (skillType !== undefined) state.skillSpecs[idx].skillType = skillType;
    saveSkillSpecs(state.skillSpecs);
    return c.json(state.skillSpecs[idx]);
  });

  app.delete('/skill-specs/:id', (c) => {
    const idx = state.skillSpecs.findIndex(s => s.id === c.req.param('id'));
    if (idx === -1) return c.json({ error: 'Skill spec not found' }, 404);
    state.skillSpecs.splice(idx, 1);
    saveSkillSpecs(state.skillSpecs);
    return c.body(null, 204);
  });

  // ---- Permission Rules ----

  app.get('/permission-rules', (c) => {
    return c.json(state.permissionRules);
  });

  app.post('/permission-rules', async (c) => {
    const { toolName, pathPattern, behavior } = await c.req.json();
    if (!toolName || !behavior) {
      return c.json({ error: 'toolName and behavior are required' }, 400);
    }
    const rule: PermissionRule = {
      id: randomUUID(),
      toolName,
      pathPattern: pathPattern || undefined,
      behavior,
      createdAt: new Date().toISOString(),
    };
    state.permissionRules.push(rule);
    savePermissionRules(state.permissionRules);
    broadcast({ type: 'permission_rules_updated', rules: state.permissionRules });
    return c.json(rule, 201);
  });

  app.delete('/permission-rules/:id', (c) => {
    const idx = state.permissionRules.findIndex(r => r.id === c.req.param('id'));
    if (idx === -1) return c.json({ error: 'Rule not found' }, 404);
    state.permissionRules.splice(idx, 1);
    savePermissionRules(state.permissionRules);
    broadcast({ type: 'permission_rules_updated', rules: state.permissionRules });
    return c.body(null, 204);
  });

  return app;
}
