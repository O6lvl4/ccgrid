import { useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { Text, YStack } from 'tamagui';
import { useStore } from '../../store/useStore';

export function OutputTab({ sessionId }: { sessionId: string }) {
  const session = useStore(s => s.sessions.get(sessionId));
  const output = useStore(s => s.leadOutputs.get(sessionId) ?? '');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  if (!session) return null;

  return (
    <YStack flex={1} overflow="hidden" bg="$gray1">
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 0',
          backgroundColor: 'var(--color-gray1, #111)',
        }}
      >
        <div style={{ maxWidth: 640, width: '100%', margin: '0 auto', padding: '0 16px' }}>
          {output ? (
            <div className="prose prose-sm prose-invert max-w-none prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 prose-code:text-blue-300 prose-headings:text-gray-100 prose-p:text-gray-200 prose-li:text-gray-200 prose-strong:text-white prose-a:text-blue-400">
              <Markdown>{output}</Markdown>
            </div>
          ) : (
            <Text color="$gray7" fontStyle="italic" fontSize={13}>
              {session.status === 'starting' ? 'Starting lead agent...' : 'No output yet'}
            </Text>
          )}
        </div>
      </div>
    </YStack>
  );
}
