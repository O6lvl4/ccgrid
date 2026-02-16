import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { SDKUserMessage, SettingSource } from '@anthropic-ai/claude-agent-sdk';
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources';
import type { Session, FileAttachment } from '@ccgrid/shared';
import { buildSystemPrompt } from './prompt-builder.js';
import { buildAgents, filesToContentBlocks } from './agent-builder.js';
import { createHookHandlers } from './hook-handlers.js';
import { createCanUseTool } from './permission-evaluator.js';

export const ATTACHMENTS_BASE_DIR = path.join(os.tmpdir(), 'claude-team-files');

export function saveAttachmentsToTmp(sessionId: string, files: FileAttachment[]): string[] {
  const dir = path.join(ATTACHMENTS_BASE_DIR, sessionId);
  fs.mkdirSync(dir, { recursive: true });
  const savedPaths: string[] = [];
  for (const file of files) {
    const safeName = path.basename(file.name);
    const filePath = path.join(dir, safeName);
    if (!filePath.startsWith(dir + path.sep)) continue;
    fs.writeFileSync(filePath, Buffer.from(file.base64Data, 'base64'));
    savedPaths.push(filePath);
  }
  return savedPaths;
}

export function cleanupAttachments(sessionId: string): void {
  const dir = path.join(ATTACHMENTS_BASE_DIR, sessionId);
  fs.rmSync(dir, { recursive: true, force: true });
}

export function buildPromptOrStream(prompt: string, files?: FileAttachment[]): string | AsyncIterable<SDKUserMessage> {
  if (!files || files.length === 0) return prompt;
  return (async function*() {
    const contentBlocks: ContentBlockParam[] = [
      { type: 'text', text: prompt },
      ...filesToContentBlocks(files),
    ];
    yield {
      type: 'user' as const,
      message: { role: 'user' as const, content: contentBlocks },
      parent_tool_use_id: null,
      session_id: '',
    };
  })();
}

export function buildQueryOptions(opts: {
  session: Session;
  resumePrompt?: string;
  maxBudgetUsd?: number;
  abortController: AbortController;
  agents?: ReturnType<typeof buildAgents>;
  hooks: ReturnType<typeof createHookHandlers>;
  canUseTool?: ReturnType<typeof createCanUseTool>;
}) {
  const { session, resumePrompt, maxBudgetUsd, abortController, agents, hooks, canUseTool } = opts;
  return {
    ...(resumePrompt && session.sessionId ? { resume: session.sessionId } : {}),
    cwd: session.cwd,
    model: session.model,
    permissionMode: 'default' as const,
    canUseTool,
    includePartialMessages: true,
    maxTurns: 999999,
    ...(maxBudgetUsd !== undefined ? { maxBudgetUsd } : {}),
    abortController,
    ...(agents ? { agents } : {}),
    env: { ...process.env, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' },
    systemPrompt: buildSystemPrompt(session.customInstructions),
    settingSources: ['user', 'project'] as SettingSource[],
    hooks: {
      SubagentStart: [{ hooks: [hooks.onSubagentStart] }],
      SubagentStop: [{ hooks: [hooks.onSubagentStop] }],
      TeammateIdle: [{ hooks: [hooks.onTeammateIdle] }],
      TaskCompleted: [{ hooks: [hooks.onTaskCompleted] }],
    },
  };
}
