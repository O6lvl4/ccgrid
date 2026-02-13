import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Session, Teammate, ServerMessage } from '@ccgrid/shared';

const PROJECTS_DIR = join(process.env.HOME ?? '', '.claude', 'projects');

function extractToolResultText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return (content as Record<string, unknown>[])
      .filter((item) => item.type === 'text' && item.text)
      .map((item) => item.text as string)
      .join('\n');
  }
  return '';
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

function collectAssistantText(content: unknown[], toolUseMap: Map<string, string>): string[] {
  const parts: string[] = [];
  for (const block of content) {
    const b = block as Record<string, unknown>;
    if (b.type === 'text' && b.text) {
      parts.push(b.text as string);
    }
    if (b.type === 'tool_use' && b.id && b.name) {
      toolUseMap.set(b.id as string, b.name as string);
    }
  }
  return parts;
}

function collectToolResults(content: unknown[], toolUseMap: Map<string, string>): string[] {
  const parts: string[] = [];
  for (const block of content) {
    const b = block as Record<string, unknown>;
    if (b.type !== 'tool_result' || !b.tool_use_id) continue;
    const toolName = toolUseMap.get(b.tool_use_id as string) ?? 'Tool';
    const resultText = extractToolResultText(b.content);
    if (resultText) {
      parts.push(`**${toolName}**:\n\`\`\`\n${truncate(resultText, 2000)}\n\`\`\``);
    }
  }
  return parts;
}

function parseTranscriptLine(line: string, toolUseMap: Map<string, string>): string[] {
  const msg = JSON.parse(line);

  if (msg.type === 'assistant' && Array.isArray(msg.message?.content)) {
    return collectAssistantText(msg.message.content, toolUseMap);
  }

  if (msg.type === 'user') {
    const userContent = msg.content ?? msg.message?.content ?? [];
    if (Array.isArray(userContent)) {
      return collectToolResults(userContent, toolUseMap);
    }
  }

  if (msg.type === 'result' && msg.result_text) {
    return [msg.result_text];
  }

  return [];
}

export async function readTranscriptFromPath(filePath: string): Promise<string | undefined> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const parts: string[] = [];
    const toolUseMap = new Map<string, string>();

    for (const line of lines) {
      try {
        parts.push(...parseTranscriptLine(line, toolUseMap));
      } catch {
        // skip unparsable lines
      }
    }

    return parts.length > 0 ? parts.join('\n\n') : undefined;
  } catch {
    return undefined;
  }
}

export function encodeCwd(cwd: string): string {
  return '-' + cwd.replace(/[/.]/g, '-').replace(/^-/, '');
}

export async function readTeammateTranscript(cwd: string, sdkSessionId: string, agentId: string): Promise<string | undefined> {
  const transcriptPath = join(PROJECTS_DIR, encodeCwd(cwd), sdkSessionId, 'subagents', `agent-${agentId}.jsonl`);
  return readTranscriptFromPath(transcriptPath);
}

export interface TranscriptDeps {
  sessions: Map<string, Session>;
  teammates: Map<string, Teammate>;
  broadcast: (msg: ServerMessage) => void;
  persistSession: (sessionId: string) => void;
}

export async function loadTeammateOutputs(sessionId: string, deps: TranscriptDeps): Promise<void> {
  const session = deps.sessions.get(sessionId);
  if (!session?.sessionId) return;

  for (const teammate of deps.teammates.values()) {
    if (teammate.sessionId !== sessionId || teammate.output) continue;

    const output = await readTeammateTranscript(session.cwd, session.sessionId, teammate.agentId);
    if (output) {
      teammate.output = output;
      deps.broadcast({
        type: 'teammate_output',
        sessionId,
        agentId: teammate.agentId,
        text: output,
      });
    }
  }

  deps.persistSession(sessionId);
}
