import { v4 as uuidv4 } from 'uuid';
import type { CanUseTool } from '@anthropic-ai/claude-agent-sdk';
import type { PermissionLogEntry, PermissionRule, ServerMessage } from '@ccgrid/shared';
import { loadPermissionRules } from './state-store.js';

export interface PermissionMaps {
  pendingPermissions: Map<string, {
    resolve: (result: { behavior: 'allow'; updatedInput?: Record<string, unknown> } | { behavior: 'deny'; message: string }) => void;
  }>;
  pendingPermissionInputs: Map<string, Record<string, unknown>>;
  pendingPermissionMeta: Map<string, { sessionId: string; toolName: string; description?: string; agentId?: string }>;
}

export function createCanUseTool(
  sessionId: string,
  broadcast: (msg: ServerMessage) => void,
  maps: PermissionMaps,
): CanUseTool {
  return (toolName, input, options) => {
    console.log(`[canUseTool] session=${sessionId.slice(0, 8)} tool=${toolName} agent=${options.agentID ?? 'lead'} toolUseID=${options.toolUseID}`);

    const rules = loadPermissionRules();
    const matchedRule = rules.find(r => {
      if (r.toolName !== '*' && r.toolName !== toolName) return false;
      if (r.pathPattern) {
        const inputObj = input as Record<string, unknown>;
        const filePath = (inputObj.file_path ?? inputObj.path ?? inputObj.command ?? '') as string;
        if (!filePath.includes(r.pathPattern.replace(/\*\*/g, '').replace(/\*/g, ''))) return false;
      }
      return true;
    });

    if (matchedRule) {
      console.log(`[canUseTool:auto] rule=${matchedRule.id.slice(0, 8)} behavior=${matchedRule.behavior} tool=${toolName}`);
      const entry: PermissionLogEntry = {
        requestId: `auto-${Date.now()}`,
        sessionId,
        toolName,
        input: input as Record<string, unknown>,
        description: options.decisionReason,
        agentId: options.agentID,
        behavior: 'auto',
        rule: `${matchedRule.toolName}${matchedRule.pathPattern ? ` (${matchedRule.pathPattern})` : ''}: ${matchedRule.behavior}`,
        timestamp: new Date().toISOString(),
      };
      broadcast({ type: 'permission_resolved', entry });

      if (matchedRule.behavior === 'allow') {
        return Promise.resolve({ behavior: 'allow' as const, updatedInput: input as Record<string, unknown> });
      } else {
        return Promise.resolve({ behavior: 'deny' as const, message: `Denied by rule: ${matchedRule.toolName}` });
      }
    }

    return new Promise((resolve) => {
      const requestId = uuidv4();
      const wrappedResolve = (result: { behavior: 'allow'; updatedInput?: Record<string, unknown> } | { behavior: 'deny'; message: string }) => {
        console.log(`[canUseTool:resolved] requestId=${requestId.slice(0, 8)} behavior=${result.behavior} tool=${toolName}`);
        resolve(result);
      };
      maps.pendingPermissions.set(requestId, { resolve: wrappedResolve });
      maps.pendingPermissionInputs.set(requestId, input as Record<string, unknown>);
      maps.pendingPermissionMeta.set(requestId, { sessionId, toolName, description: options.decisionReason, agentId: options.agentID });

      console.log(`[canUseTool:broadcast] requestId=${requestId.slice(0, 8)}`);
      broadcast({
        type: 'permission_request',
        sessionId,
        requestId,
        toolName,
        input,
        description: options.decisionReason,
        agentId: options.agentID,
      });

      if (options.signal.aborted) {
        console.log(`[canUseTool:already-aborted] requestId=${requestId.slice(0, 8)}`);
        maps.pendingPermissions.delete(requestId);
        maps.pendingPermissionInputs.delete(requestId);
        maps.pendingPermissionMeta.delete(requestId);
        wrappedResolve({ behavior: 'deny', message: 'Already aborted' });
        return;
      }

      options.signal.addEventListener('abort', () => {
        console.log(`[canUseTool:abort] requestId=${requestId.slice(0, 8)} tool=${toolName}`);
        maps.pendingPermissions.delete(requestId);
        maps.pendingPermissionInputs.delete(requestId);
        maps.pendingPermissionMeta.delete(requestId);
        wrappedResolve({ behavior: 'deny', message: 'Aborted' });
      });
    });
  };
}
