import { useState, useCallback } from 'react';
import { Button, Text, TextArea, XStack, YStack } from 'tamagui';
import { useApi } from '../hooks/useApi';

function InputAvatar() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      minWidth: 28,
      borderRadius: 14,
      backgroundColor: '#3b82f6',
      flexShrink: 0,
    }}>
      <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, lineHeight: 1 }}>✎</span>
    </div>
  );
}

export function FollowUpInput({ sessionId }: { sessionId: string }) {
  const api = useApi();
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    const text = prompt.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await api.continueSession(sessionId, text);
      setPrompt('');
    } catch (err) {
      console.error('Failed to continue session:', err);
    } finally {
      setSending(false);
    }
  }, [api, sessionId, prompt, sending]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <YStack
      borderWidth={1}
      borderColor="$gray5"
      borderRadius="$3"
      overflow="hidden"
    >
      <XStack ai="center" gap="$2" paddingHorizontal="$3" paddingVertical="$2">
        <InputAvatar />
        <Text color="$gray12" fontWeight="600" fontSize={13}>Follow-up</Text>
      </XStack>
      <YStack paddingHorizontal="$3" paddingBottom="$3" gap="$2">
        <TextArea
          value={prompt}
          onChangeText={setPrompt}
          placeholder="追加の指示を入力... (Cmd+Enter で送信)"
          disabled={sending}
          minHeight={60}
          bg="$gray2"
          borderColor="$gray4"
          color="$gray12"
          fontSize={13}
          onKeyDown={handleKeyDown}
        />
        <XStack jc="flex-end">
          <Button
            size="$2"
            theme="active"
            disabled={!prompt.trim() || sending}
            opacity={!prompt.trim() || sending ? 0.5 : 1}
            onPress={handleSend}
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}
