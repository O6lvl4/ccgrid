import { useState, useCallback, useRef } from 'react';
import { Button, Text, TextArea, XStack, YStack } from 'tamagui';
import { useApi } from '../hooks/useApi';
import { readFilesAsAttachments, FILE_ACCEPT } from '../utils/fileUtils';

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
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(async () => {
    const text = prompt.trim();
    if ((!text && attachedFiles.length === 0) || sending) return;
    setSending(true);
    try {
      const files = attachedFiles.length > 0
        ? await readFilesAsAttachments(attachedFiles)
        : undefined;
      await api.continueSession(sessionId, text || '添付ファイルを確認してください', files);
      setPrompt('');
      setAttachedFiles([]);
    } catch (err) {
      console.error('Failed to continue session:', err);
    } finally {
      setSending(false);
    }
  }, [api, sessionId, prompt, sending, attachedFiles]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const canSend = (prompt.trim() || attachedFiles.length > 0) && !sending;

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
        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <XStack gap="$1.5" flexWrap="wrap">
            {attachedFiles.map((f, i) => (
              <XStack
                key={`${f.name}-${i}`}
                ai="center"
                gap="$1"
                px="$2"
                py="$1"
                bg="$gray3"
                borderWidth={1}
                borderColor="$gray5"
                rounded="$2"
              >
                <Text fontSize={11} color="$gray11">
                  {f.type.startsWith('image/') ? '\uD83D\uDDBC' : f.type === 'application/pdf' ? '\uD83D\uDCC4' : '\uD83D\uDCDD'} {f.name}
                </Text>
                <Text
                  fontSize={11}
                  color="$gray8"
                  cursor="pointer"
                  hoverStyle={{ color: '$red9' }}
                  onPress={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))}
                >
                  x
                </Text>
              </XStack>
            ))}
          </XStack>
        )}

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
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={FILE_ACCEPT}
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) {
              setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
              e.target.value = '';
            }
          }}
        />
        <XStack jc="space-between" ai="center">
          <Button
            size="$2"
            bg="$gray3"
            color="$gray11"
            borderWidth={1}
            borderColor="$gray5"
            hoverStyle={{ bg: '$gray4' }}
            onPress={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            + Files
          </Button>
          <Button
            size="$2"
            theme="active"
            disabled={!canSend}
            opacity={!canSend ? 0.5 : 1}
            onPress={handleSend}
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}
