import { useCallback, useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useStore, type TeammateMessage } from '../../store/useStore';
import { useApi } from '../../hooks/useApi';
import { StatusBadge } from '../StatusBadge';
import { markdownComponents } from '../CodeBlock';
import type { Teammate } from '@ccgrid/shared';

function InfoRow({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '5px 0' }}>
      <span style={{ fontSize: 12, color: '#8b95a3', flexShrink: 0, width: 90, fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: 13,
        color: '#1a1d24',
        minWidth: 0,
        flex: 1,
        ...(mono ? { fontFamily: 'monospace', fontSize: 11, color: '#555e6b' } : {}),
      }}>
        {children}
      </span>
    </div>
  );
}

function MessageBubble({ msg }: { msg: TeammateMessage }) {
  const time = new Date(msg.timestamp);
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      background: 'rgba(10, 185, 230, 0.06)',
      border: '1px solid rgba(10, 185, 230, 0.15)',
      borderRadius: 14,
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#0a9ec4' }}>
          You → {msg.teammateName}
        </span>
        <span style={{ fontSize: 10, color: '#b0b8c4' }}>{timeStr}</span>
      </div>
      <span style={{ fontSize: 13, color: '#1a1d24', lineHeight: 1.5 }}>{msg.message}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 800,
      color: '#8b95a3',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function TeammateMessageInput({ sessionId, teammateName }: { sessionId: string; teammateName: string }) {
  const api = useApi();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await api.sendToTeammate(sessionId, teammateName, text);
      setMessage('');
    } catch (err) {
      console.error('Failed to send message to teammate:', err);
    } finally {
      setSending(false);
    }
  }, [api, sessionId, teammateName, message, sending]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const canSend = message.trim() && !sending;

  return (
    <div style={{
      borderTop: '1px solid #f0f1f3',
      background: '#f9fafb',
      padding: '14px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          minWidth: 24,
          borderRadius: 12,
          backgroundColor: '#0ab9e6',
          flexShrink: 0,
        }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, lineHeight: 1 }}>✎</span>
        </div>
        <span style={{ color: '#1a1d24', fontWeight: 700, fontSize: 13 }}>
          Message to {teammateName}
        </span>
        <span style={{ color: '#b0b8c4', fontSize: 11, flex: 1, textAlign: 'right' }}>
          Relayed via Lead
        </span>
      </div>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`${teammateName} への指示を入力... (Cmd+Enter で送信)`}
        disabled={sending}
        rows={3}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          minHeight: 64,
          padding: '10px 12px',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          background: '#fff',
          color: '#1a1d24',
          fontSize: 13,
          lineHeight: 1.5,
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#0ab9e6'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: '#b0b8c4', letterSpacing: 0.2 }}>⌘ Enter</span>
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 34,
            minWidth: 72,
            paddingLeft: 18,
            paddingRight: 18,
            borderRadius: 17,
            border: 'none',
            background: canSend ? '#0ab9e6' : '#e8eaed',
            color: canSend ? '#fff' : '#b0b8c4',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.4,
            cursor: canSend ? 'pointer' : 'default',
            transition: 'background 0.2s, transform 0.12s, box-shadow 0.2s',
            boxShadow: canSend ? '0 2px 8px rgba(10,185,230,0.25)' : 'none',
          }}
          onMouseEnter={e => { if (canSend) { e.currentTarget.style.background = '#09a8d2'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(10,185,230,0.35)'; } }}
          onMouseLeave={e => { if (canSend) { e.currentTarget.style.background = '#0ab9e6'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(10,185,230,0.25)'; } e.currentTarget.style.transform = 'scale(1)'; }}
          onMouseDown={e => { if (canSend) e.currentTarget.style.transform = 'scale(0.95)'; }}
          onMouseUp={e => { if (canSend) e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

const proseClass = 'prose prose-sm max-w-none prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200 prose-code:text-blue-600 prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-a:text-blue-600';

function TeammateHeader({ teammate, goBack }: { teammate: Teammate; goBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', background: '#ffffff', borderBottom: '1px solid #f0f1f3', flexShrink: 0 }}>
      <span
        style={{ fontSize: 12, color: '#b0b8c4', cursor: 'pointer', lineHeight: 1, fontWeight: 600, transition: 'color 0.15s' }}
        onClick={goBack}
        onMouseEnter={e => { e.currentTarget.style.color = '#1a1d24'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#b0b8c4'; }}
      >
        ← Back
      </span>
      <span style={{ fontWeight: 800, fontSize: 16, color: '#1a1d24', lineHeight: 1 }}>
        {teammate.name ?? teammate.agentId.slice(0, 8)}
      </span>
      <StatusBadge status={teammate.status} />
      <span style={{ fontSize: 11, color: '#8b95a3', fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: '#f0f1f3' }}>
        {teammate.agentType}
      </span>
    </div>
  );
}

function TeammateContent({ teammate, teammateMessages }: { teammate: Teammate; teammateMessages: TeammateMessage[] }) {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ background: '#f9fafb', border: '1px solid #f0f1f3', borderRadius: 14, padding: '14px 18px' }}>
        <InfoRow label="Agent ID" mono>{teammate.agentId}</InfoRow>
        <InfoRow label="Type">{teammate.agentType}</InfoRow>
        <InfoRow label="Status"><StatusBadge status={teammate.status} /></InfoRow>
        {teammate.name && <InfoRow label="Name">{teammate.name}</InfoRow>}
        {teammate.transcriptPath && <InfoRow label="Transcript" mono>{teammate.transcriptPath}</InfoRow>}
      </div>
      <div>
        <SectionLabel>Output</SectionLabel>
        {teammate.output ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: 14, padding: 18, border: '1px solid #f0f1f3' }} className={proseClass}>
            <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>{teammate.output}</Markdown>
          </div>
        ) : (
          <span style={{ fontSize: 13, color: '#b0b8c4', fontStyle: 'italic' }}>No output yet</span>
        )}
      </div>
      {teammateMessages.length > 0 && (
        <div>
          <SectionLabel>Messages</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teammateMessages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export function TeammateDetailView({ sessionId, agentId }: { sessionId: string; agentId: string }) {
  const teammate = useStore(s => s.teammates.get(agentId));
  const session = useStore(s => s.sessions.get(sessionId));
  const messagesRaw = useStore(s => s.teammateMessages.get(sessionId));
  const messages = messagesRaw ?? [];
  const navigate = useStore(s => s.navigate);
  const goBack = useStore(s => s.goBack);

  const canSendMessage = teammate?.name && session && (session.status === 'running' || session.status === 'completed');
  const teammateMessages = teammate?.name ? messages.filter(m => m.teammateName === teammate.name) : [];

  useEffect(() => {
    if (!teammate) navigate({ view: 'session_detail', sessionId, tab: 'teammates' });
  }, [teammate, navigate, sessionId]);

  if (!teammate) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <TeammateHeader teammate={teammate} goBack={goBack} />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <TeammateContent teammate={teammate} teammateMessages={teammateMessages} />
      </div>
      {canSendMessage && <TeammateMessageInput sessionId={sessionId} teammateName={teammate.name!} />}
    </div>
  );
}
