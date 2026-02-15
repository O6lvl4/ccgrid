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

export function saveAttachmentsToTmp(sessionId: string, files: FileAttachment[]): string[] {
  const dir = path.join(os.tmpdir(), 'claude-team-files', sessionId);
  fs.mkdirSync(dir, { recursive: true });
  const savedPaths: string[] = [];
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    fs.writeFileSync(filePath, Buffer.from(file.base64Data, 'base64'));
    savedPaths.push(filePath);
  }
  return savedPaths;
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
  const isBypass = session.permissionMode === 'bypassPermissions';
  return {
    ...(resumePrompt && session.sessionId ? { resume: session.sessionId } : {}),
    cwd: session.cwd,
    model: session.model,
    permissionMode: isBypass ? ('bypassPermissions' as const) : ('default' as const),
    ...(isBypass ? { allowDangerouslySkipPermissions: true } : { canUseTool }),
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
