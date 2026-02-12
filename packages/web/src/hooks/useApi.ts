import { useCallback } from 'react';
import type { Session, TeammateSpec, SkillSpec, PermissionRule } from '@ccgrid/shared';

export interface Api {
  createSession: (params: {
    name: string;
    cwd: string;
    model: string;
    teammateSpecs?: TeammateSpec[];
    maxBudgetUsd?: number;
    taskDescription: string;
    permissionMode?: 'acceptEdits' | 'bypassPermissions';
    customInstructions?: string;
  }) => Promise<Session>;
  updateSession: (id: string, updates: { name?: string }) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  stopSession: (id: string) => Promise<Session>;
  continueSession: (id: string, prompt: string) => Promise<Session>;
  createSpec: (params: { name: string; role: string; instructions?: string; skillIds?: string[] }) => Promise<TeammateSpec>;
  updateSpec: (id: string, updates: { name?: string; role?: string; instructions?: string; skillIds?: string[] }) => Promise<TeammateSpec>;
  deleteSpec: (id: string) => Promise<void>;
  createSkillSpec: (params: { name: string; description: string; skillType?: string }) => Promise<SkillSpec>;
  updateSkillSpec: (id: string, updates: { name?: string; description?: string; skillType?: string }) => Promise<SkillSpec>;
  deleteSkillSpec: (id: string) => Promise<void>;
  sendToTeammate: (sessionId: string, teammateName: string, message: string) => Promise<Session>;
  createPermissionRule: (params: { toolName: string; pathPattern?: string; behavior: 'allow' | 'deny' }) => Promise<PermissionRule>;
  deletePermissionRule: (id: string) => Promise<void>;
}

const BASE = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json();
}

export function useApi(): Api {
  const createSession = useCallback((params: {
    name: string;
    cwd: string;
    model: string;
    teammateSpecs?: TeammateSpec[];
    maxBudgetUsd?: number;
    taskDescription: string;
    permissionMode?: 'acceptEdits' | 'bypassPermissions';
    customInstructions?: string;
  }) => request<Session>('POST', '/sessions', params), []);

  const updateSession = useCallback((id: string, updates: { name?: string }) =>
    request<Session>('PATCH', `/sessions/${id}`, updates), []);

  const deleteSession = useCallback((id: string) =>
    request<void>('DELETE', `/sessions/${id}`), []);

  const stopSession = useCallback((id: string) =>
    request<Session>('POST', `/sessions/${id}/stop`), []);

  const continueSession = useCallback((id: string, prompt: string) =>
    request<Session>('POST', `/sessions/${id}/continue`, { prompt }), []);

  const createSpec = useCallback((params: { name: string; role: string; instructions?: string; skillIds?: string[] }) =>
    request<TeammateSpec>('POST', '/teammate-specs', params), []);

  const updateSpec = useCallback((id: string, updates: { name?: string; role?: string; instructions?: string; skillIds?: string[] }) =>
    request<TeammateSpec>('PATCH', `/teammate-specs/${id}`, updates), []);

  const deleteSpec = useCallback((id: string) =>
    request<void>('DELETE', `/teammate-specs/${id}`), []);

  const createSkillSpec = useCallback((params: { name: string; description: string; skillType?: string }) =>
    request<SkillSpec>('POST', '/skill-specs', params), []);

  const updateSkillSpec = useCallback((id: string, updates: { name?: string; description?: string; skillType?: string }) =>
    request<SkillSpec>('PATCH', `/skill-specs/${id}`, updates), []);

  const deleteSkillSpec = useCallback((id: string) =>
    request<void>('DELETE', `/skill-specs/${id}`), []);

  const sendToTeammate = useCallback((sessionId: string, teammateName: string, message: string) =>
    request<Session>('POST', `/sessions/${sessionId}/teammates/${encodeURIComponent(teammateName)}/message`, { message }), []);

  const createPermissionRule = useCallback((params: { toolName: string; pathPattern?: string; behavior: 'allow' | 'deny' }) =>
    request<PermissionRule>('POST', '/permission-rules', params), []);

  const deletePermissionRule = useCallback((id: string) =>
    request<void>('DELETE', `/permission-rules/${id}`), []);

  return { createSession, updateSession, deleteSession, stopSession, continueSession, createSpec, updateSpec, deleteSpec, createSkillSpec, updateSkillSpec, deleteSkillSpec, sendToTeammate, createPermissionRule, deletePermissionRule };
}
