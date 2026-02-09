import { useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../StatusBadge';

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <XStack gap="$3" ai="center" py="$1">
      <Text fontSize={12} color="$gray8" width={80}>{label}</Text>
      <Text fontSize={13} color="$gray12" minWidth={0} flex={1}>{children}</Text>
    </XStack>
  );
}

export function TeammateDetailView({ sessionId, agentId }: { sessionId: string; agentId: string }) {
  const teammate = useStore(s => s.teammates.get(agentId));
  const navigate = useStore(s => s.navigate);
  const goBack = useStore(s => s.goBack);

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
                <Markdown remarkPlugins={[remarkGfm]}>{teammate.output}</Markdown>
              </div>
            ) : (
              <Text fontSize={13} color="$gray7" fontStyle="italic">No output yet</Text>
            )}
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
