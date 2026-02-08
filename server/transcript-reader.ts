import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Session, Teammate, ServerMessage } from '../shared/types.js';

const PROJECTS_DIR = join(process.env.HOME ?? '', '.claude', 'projects');

function extractToolResultText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((item: any) => item.type === 'text' && item.text)
      .map((item: any) => item.text)
      .join('\n');
  }
  return '';
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

export async function readTranscriptFromPath(filePath: string): Promise<string | undefined> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const parts: string[] = [];

    // Map tool_use_id -> tool name for matching results
    const toolUseMap = new Map<string, string>();

    for (const line of lines) {
      try {
        const msg = JSON.parse(line);

        if (msg.type === 'assistant' && Array.isArray(msg.message?.content)) {
          for (const block of msg.message.content) {
            if (block.type === 'text' && block.text) {
              parts.push(block.text);
            }
            if (block.type === 'tool_use' && block.id && block.name) {
              toolUseMap.set(block.id, block.name);
            }
          }
        }

        if (msg.type === 'user') {
          const userContent = msg.content ?? msg.message?.content ?? [];
          if (Array.isArray(userContent)) {
            for (const block of userContent) {
              if (block.type === 'tool_result' && block.tool_use_id) {
                const toolName = toolUseMap.get(block.tool_use_id) ?? 'Tool';
                const resultText = extractToolResultText(block.content);
                if (resultText) {
                  parts.push(`**${toolName}**:\n\`\`\`\n${truncate(resultText, 2000)}\n\`\`\``);
                }
              }
            }
          }
        }

        if (msg.type === 'result' && msg.result_text) {
          parts.push(msg.result_text);
        }
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
