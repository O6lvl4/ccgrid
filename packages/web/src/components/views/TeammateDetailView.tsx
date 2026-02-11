import { useCallback, useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Button, ScrollView, Text, TextArea, XStack, YStack } from 'tamagui';
import { useStore, type TeammateMessage } from '../../store/useStore';
import { useApi } from '../../hooks/useApi';
import { StatusBadge } from '../StatusBadge';
import { markdownComponents } from '../CodeBlock';

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <XStack gap="$3" ai="center" py="$1">
      <Text fontSize={12} color="$gray8" width={80}>{label}</Text>
      <Text fontSize={13} color="$gray12" minWidth={0} flex={1}>{children}</Text>
    </XStack>
  );
}

function MessageBubble({ msg }: { msg: TeammateMessage }) {
  const time = new Date(msg.timestamp);
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <YStack
      bg="$blue3"
      borderColor="$blue5"
      borderWidth={1}
      rounded="$3"
      p="$3"
      gap="$1"
    >
      <XStack jc="space-between" ai="center">
        <Text fontSize={11} fontWeight="600" color="$blue11">
          You → {msg.teammateName}
        </Text>
        <Text fontSize={10} color="$gray8">{timeStr}</Text>
      </XStack>
      <Text fontSize={13} color="$gray12">{msg.message}</Text>
    </YStack>
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <YStack
      borderTopWidth={1}
      borderColor="$gray4"
      bg="$gray2"
      p="$3"
      gap="$2"
      flexShrink={0}
    >
      <XStack ai="center" gap="$2">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          minWidth: 24,
          borderRadius: 12,
          backgroundColor: '#3b82f6',
          flexShrink: 0,
        }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, lineHeight: 1 }}>✎</span>
        </div>
        <Text color="$gray12" fontWeight="600" fontSize={13}>
          Message to {teammateName}
        </Text>
        <Text color="$gray8" fontSize={11} flex={1} textAlign="right">
          Relayed via Lead
        </Text>
      </XStack>
      <TextArea
        value={message}
        onChangeText={setMessage}
        placeholder={`${teammateName} への指示を入力... (Cmd+Enter で送信)`}
        disabled={sending}
        minHeight={60}
        bg="$gray1"
        borderColor="$gray4"
        color="$gray12"
        fontSize={13}
        onKeyDown={handleKeyDown}
      />
      <XStack jc="flex-end">
        <Button
          size="$2"
          theme="active"
          disabled={!message.trim() || sending}
          opacity={!message.trim() || sending ? 0.5 : 1}
          onPress={handleSend}
        >
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </XStack>
    </YStack>
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
  const teammateMessages = teammate?.name
    ? messages.filter(m => m.teammateName === teammate.name)
    : [];

  useEffect(() => {
    if (!teammate) navigate({ view: 'session_detail', sessionId, tab: 'teammates' });
  }, [teammate, navigate, sessionId]);

  if (!teammate) return null;

  return (
    <YStack flex={1} overflow="hidden">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          background: 'var(--gray2, #f9fafb)',
          borderBottom: '1px solid var(--gray4, #e5e7eb)',
          flexShrink: 0,
        }}
      >
        <span
          style={{ fontSize: 12, color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}
          onClick={goBack}
          onMouseEnter={e => { e.currentTarget.style.color = '#111827'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; }}
        >
          &larr; Back
        </span>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', lineHeight: 1 }}>
          {teammate.name ?? teammate.agentId.slice(0, 8)}
        </span>
        <StatusBadge status={teammate.status} />
        <span style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1 }}>{teammate.agentType}</span>
      </div>

      {/* Content */}
      <ScrollView flex={1}>
        <YStack p="$4" gap="$4" width="100%">
          {/* Metadata */}
          <YStack bg="$gray2" borderColor="$gray4" borderWidth={1} rounded="$3" p="$3" gap="$0.5">
            <InfoRow label="Agent ID">
              <Text fontSize={11} color="$gray11" fontFamily="monospace">{teammate.agentId}</Text>
            </InfoRow>
            <InfoRow label="Type">{teammate.agentType}</InfoRow>
            <InfoRow label="Status"><StatusBadge status={teammate.status} /></InfoRow>
            {teammate.name && <InfoRow label="Name">{teammate.name}</InfoRow>}
            {teammate.transcriptPath && (
              <InfoRow label="Transcript">
                <Text fontSize={11} color="$gray9" fontFamily="monospace" numberOfLines={1}>
                  {teammate.transcriptPath}
                </Text>
              </InfoRow>
            )}
          </YStack>

          {/* Output */}
          <YStack gap="$2">
            <Text fontSize={11} fontWeight="600" color="$gray8" textTransform="uppercase" letterSpacing={0.5}>
              Output
            </Text>
            {teammate.output ? (
              <div
                style={{ backgroundColor: '#ffffff', borderRadius: 8, padding: 16, border: '1px solid #e5e7eb' }}
                className="prose prose-sm max-w-none prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200 prose-code:text-blue-600 prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-a:text-blue-600"
              >
                <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>{teammate.output}</Markdown>
              </div>
            ) : (
              <Text fontSize={13} color="$gray7" fontStyle="italic">No output yet</Text>
            )}
          </YStack>

          {/* Sent messages history */}
          {teammateMessages.length > 0 && (
            <YStack gap="$2">
              <Text fontSize={11} fontWeight="600" color="$gray8" textTransform="uppercase" letterSpacing={0.5}>
                Messages
              </Text>
              <YStack gap="$2">
                {teammateMessages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} />
                ))}
              </YStack>
            </YStack>
          )}
        </YStack>
      </ScrollView>

      {/* Message input */}
      {canSendMessage && (
        <TeammateMessageInput sessionId={sessionId} teammateName={teammate.name!} />
      )}
    </YStack>
  );
}
