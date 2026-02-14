import { Hono } from 'hono';
import { execSync } from 'child_process';
import { readFileSync, readdirSync, existsSync, rmSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { getPluginsDir, savePlugins, saveSkillSpecs } from '../state-store.js';
import type { SkillSpec, PluginSpec, ServerMessage } from '@ccgrid/shared';

interface PluginsState {
  plugins: PluginSpec[];
  skillSpecs: SkillSpec[];
}

interface PluginMeta {
  name: string;
  description: string;
  version: string;
  author: string;
  repository: string;
}

/** Parse YAML-like frontmatter from SKILL.md (simple key: value parser) */
function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const meta: Record<string, string> = {};
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { meta, body: content };
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key && val) meta[key] = val.replace(/^["']|["']$/g, '');
  }
  const body = content.slice(match[0].length).trim();
  return { meta, body };
}

/** Clone repo and return cloneDir path. Throws on failure. */
function cloneRepo(source: string, cloneDir: string): void {
  const pluginsDir = getPluginsDir();
  mkdirSync(pluginsDir, { recursive: true });
  if (existsSync(cloneDir)) rmSync(cloneDir, { recursive: true });
  execSync(`git clone --depth 1 https://github.com/${source}.git "${cloneDir}"`, {
    stdio: 'pipe',
    timeout: 30000,
  });
}

/** Read and parse .claude-plugin/plugin.json from cloned repo */
function readPluginMeta(cloneDir: string): PluginMeta | null {
  const pluginJsonPath = join(cloneDir, '.claude-plugin', 'plugin.json');
  if (!existsSync(pluginJsonPath)) return null;
  try {
    const raw = JSON.parse(readFileSync(pluginJsonPath, 'utf-8'));
    return {
      ...raw,
      author: typeof raw.author === 'object' && raw.author?.name ? raw.author.name : String(raw.author ?? ''),
    };
  } catch {
    return null;
  }
}

/** Discover skills from skills/{name}/SKILL.md in cloned repo */
function discoverSkills(cloneDir: string, pluginMeta: PluginMeta, pluginName: string): SkillSpec[] {
  const skillsDir = join(cloneDir, 'skills');
  if (!existsSync(skillsDir)) return [];

  const skills: SkillSpec[] = [];
  for (const entry of readdirSync(skillsDir)) {
    const skillDir = join(skillsDir, entry);
    if (!statSync(skillDir).isDirectory()) continue;
    const skillMdPath = join(skillDir, 'SKILL.md');
    if (!existsSync(skillMdPath)) continue;

    const { meta, body } = parseFrontmatter(readFileSync(skillMdPath, 'utf-8'));
    skills.push({
      id: randomUUID(),
      name: meta.name || entry,
      description: meta.description || `Skill from ${pluginMeta.name}`,
      skillType: 'external',
      createdAt: new Date().toISOString(),
      pluginName,
      skillMdContent: body,
      allowedTools: meta['allowed-tools'] || undefined,
      argumentHint: meta['argument-hint'] || undefined,
    });
  }
  return skills;
}

export function pluginRoutes(state: PluginsState, broadcast: (msg: ServerMessage) => void) {
  const app = new Hono();

  app.get('/plugins', (c) => {
    return c.json(state.plugins);
  });

  app.post('/plugins/install', async (c) => {
    const { source, alias } = await c.req.json<{ source: string; alias?: string }>();
    if (!source || !source.includes('/')) {
      return c.json({ error: 'source must be in owner/repo format' }, 400);
    }
    if (state.plugins.some(p => p.source === source)) {
      return c.json({ error: `Plugin ${source} is already installed` }, 409);
    }

    const repoName = source.split('/')[1];
    const cloneDir = join(getPluginsDir(), repoName);

    try {
      cloneRepo(source, cloneDir);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: `Failed to clone: ${msg}` }, 500);
    }

    const pluginMeta = readPluginMeta(cloneDir);
    if (!pluginMeta) {
      rmSync(cloneDir, { recursive: true });
      return c.json({ error: '.claude-plugin/plugin.json not found or invalid' }, 400);
    }

    const pluginName = alias || pluginMeta.name;
    const newSkills = discoverSkills(cloneDir, pluginMeta, pluginName);
    if (newSkills.length === 0) {
      rmSync(cloneDir, { recursive: true });
      return c.json({ error: 'No skills found in repository (expected skills/*/SKILL.md)' }, 400);
    }

    const pluginSpec: PluginSpec = {
      name: pluginName,
      description: pluginMeta.description,
      version: pluginMeta.version,
      author: pluginMeta.author,
      repository: pluginMeta.repository,
      source,
      alias: alias || undefined,
      skillIds: newSkills.map(s => s.id),
      installedAt: new Date().toISOString(),
    };

    state.plugins.push(pluginSpec);
    state.skillSpecs.push(...newSkills);
    savePlugins(state.plugins);
    saveSkillSpecs(state.skillSpecs);

    return c.json({ plugin: pluginSpec, skills: newSkills }, 201);
  });

  app.post('/plugins/:name/update', (c) => {
    const name = decodeURIComponent(c.req.param('name'));
    const plugin = state.plugins.find(p => p.name === name);
    if (!plugin) return c.json({ error: 'Plugin not found' }, 404);

    const repoName = plugin.source.split('/')[1];
    const cloneDir = join(getPluginsDir(), repoName);

    try {
      cloneRepo(plugin.source, cloneDir);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: `Failed to clone: ${msg}` }, 500);
    }

    const pluginMeta = readPluginMeta(cloneDir);
    if (!pluginMeta) {
      return c.json({ error: '.claude-plugin/plugin.json not found or invalid' }, 400);
    }

    const newSkills = discoverSkills(cloneDir, pluginMeta, plugin.name);

    // Remove old skills
    const oldSkillIds = new Set(plugin.skillIds);
    state.skillSpecs = state.skillSpecs.filter(s => !oldSkillIds.has(s.id));

    // Update plugin metadata
    plugin.version = pluginMeta.version;
    plugin.description = pluginMeta.description;
    plugin.author = pluginMeta.author;
    plugin.repository = pluginMeta.repository;
    plugin.skillIds = newSkills.map(s => s.id);

    state.skillSpecs.push(...newSkills);
    savePlugins(state.plugins);
    saveSkillSpecs(state.skillSpecs);

    return c.json({ plugin, skills: newSkills });
  });

  app.delete('/plugins/:name', (c) => {
    const name = decodeURIComponent(c.req.param('name'));
    const idx = state.plugins.findIndex(p => p.name === name);
    if (idx === -1) return c.json({ error: 'Plugin not found' }, 404);

    const plugin = state.plugins[idx];
    const skillIdSet = new Set(plugin.skillIds);

    state.skillSpecs = state.skillSpecs.filter(s => !skillIdSet.has(s.id));
    state.plugins.splice(idx, 1);
    savePlugins(state.plugins);
    saveSkillSpecs(state.skillSpecs);

    const repoName = plugin.source.split('/')[1];
    const cloneDir = join(getPluginsDir(), repoName);
    if (existsSync(cloneDir)) {
      try { rmSync(cloneDir, { recursive: true }); } catch { /* ignore */ }
    }

    return c.body(null, 204);
  });

  return app;
}
