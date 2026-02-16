import type { Session, Teammate, ServerMessage, TeammateMessage } from '@ccgrid/shared';

export interface MessagingDeps {
  sessions: Map<string, Session>;
  teammates: Map<string, Teammate>;
  activeSessions: Map<string, unknown>;
  leadOutputs: Map<string, string>;
  broadcast: (msg: ServerMessage) => void;
  persistSession: (sessionId: string) => void;
  startAgent: (opts: { session: Session; maxBudgetUsd?: number; resumePrompt: string }) => void;
}

function findTeammateByName(teammates: Map<string, Teammate>, sessionId: string, name: string): Teammate | undefined {
  for (const tm of teammates.values()) {
    if (tm.sessionId === sessionId && tm.name === name) return tm;
  }
  return undefined;
}

function buildMessageForwardPrompt(message: TeammateMessage): string {
  const messageType = message.type === 'shutdown_request' ? 'shutdown request' : 'message';
  const formattedMessage = JSON.stringify({
    type: message.type,
    sender: message.sender,
    content: message.content,
    ...(message.requestId ? { requestId: message.requestId } : {}),
  }, null, 2);

  return `A teammate has sent a ${messageType} that needs to be forwarded.

Please use the Task tool to resume teammate "${message.recipient}" with the following message:

${formattedMessage}

IMPORTANT: Include this exact JSON in the prompt parameter so the recipient can respond appropriately.`;
}

function buildBroadcastForwardPrompt(message: TeammateMessage, recipients: Teammate[]): string {
  const recipientNames = recipients.map(t => t.name ?? t.agentId).join(', ');
  const formattedMessage = JSON.stringify({
    type: 'message',
    sender: message.sender,
    content: message.content,
  }, null, 2);

  return `A teammate has broadcast a message to all team members.

Please use the Task tool to resume each of the following teammates with this message: ${recipientNames}

Message to broadcast:
${formattedMessage}

Send this to each teammate in parallel using multiple Task tool calls.`;
}

function resumeLeadForMessage(session: Session, resumePrompt: string, deps: MessagingDeps): void {
  session.status = 'running';
  deps.persistSession(session.id);
  deps.broadcast({ type: 'session_status', sessionId: session.id, status: 'running' });
  deps.startAgent({ session, maxBudgetUsd: session.maxBudgetUsd, resumePrompt });
}

export function sendToTeammate(sessionId: string, teammateName: string, message: string, deps: MessagingDeps): Session | undefined {
  const session = deps.sessions.get(sessionId);
  if (!session) return undefined;

  const isRunningOrCompleted = session.status === 'running' || session.status === 'completed';
  if (!isRunningOrCompleted || !session.sessionId) return undefined;

  const marker = `\n\n<!-- teammate-message:${teammateName} -->\n\n> **To ${teammateName}:** ${message.replace(/\n/g, '\n> ')}\n\n`;
  const existing = deps.leadOutputs.get(sessionId) ?? '';
  deps.leadOutputs.set(sessionId, existing + marker);
  deps.broadcast({ type: 'lead_output', sessionId, text: marker });
  deps.broadcast({ type: 'teammate_message_relayed', sessionId, teammateName, message });

  if (session.status === 'completed') {
    const forwardPrompt = `The user has sent a message to teammate "${teammateName}". Please forward this message by resuming the teammate using the Task tool with the resume parameter:\n\nMessage to ${teammateName}: ${message}`;
    resumeLeadForMessage(session, forwardPrompt, deps);
  }

  return session;
}

function handleDirectMessage(session: Session, sessionId: string, message: TeammateMessage, deps: MessagingDeps): void {
  const recipient = findTeammateByName(deps.teammates, sessionId, message.recipient!);
  if (!recipient) {
    console.warn(`[sendTeammateMessage] Recipient "${message.recipient}" not found in session ${sessionId}`);
    return;
  }
  const isLeadRunning = deps.activeSessions.has(sessionId) && session.status === 'running';
  if (!isLeadRunning) {
    resumeLeadForMessage(session, buildMessageForwardPrompt(message), deps);
  }
}

function handleBroadcast(session: Session, sessionId: string, message: TeammateMessage, deps: MessagingDeps): void {
  const allTeammates = Array.from(deps.teammates.values()).filter(t => t.sessionId === sessionId);
  const otherTeammates = allTeammates.filter(t => t.agentId !== message.sender && t.name !== message.sender);
  if (otherTeammates.length === 0) {
    console.warn(`[sendTeammateMessage] No other teammates found for broadcast in session ${sessionId}`);
    return;
  }
  const isLeadRunning = deps.activeSessions.has(sessionId) && session.status === 'running';
  if (!isLeadRunning) {
    resumeLeadForMessage(session, buildBroadcastForwardPrompt(message, otherTeammates), deps);
  }
}

export function sendTeammateMessage(sessionId: string, message: TeammateMessage, deps: MessagingDeps): void {
  const session = deps.sessions.get(sessionId);
  if (!session?.sessionId) return;

  deps.broadcast({ type: 'teammate_message_sent', sessionId, message });

  if ((message.type === 'message' || message.type === 'shutdown_request') && message.recipient) {
    handleDirectMessage(session, sessionId, message, deps);
  } else if (message.type === 'broadcast') {
    handleBroadcast(session, sessionId, message, deps);
  }
}
