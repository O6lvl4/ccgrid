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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              color: '#6b7280',
              fontSize: 12,
              fontWeight: 500,
              cursor: sending ? 'default' : 'pointer',
              opacity: sending ? 0.5 : 1,
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { if (!sending) { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.borderColor = '#d1d5db'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
          >
            <span style={{ fontSize: 14 }}>📎</span>
            Attach
          </button>
          <XStack ai="center" gap="$3">
            <Text fontSize={11} color="$gray8">
              ⌘+Enter
            </Text>
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: 'none',
                background: canSend ? '#3b82f6' : '#e5e7eb',
                color: canSend ? '#fff' : '#9ca3af',
                fontSize: 12,
                fontWeight: 600,
                cursor: canSend ? 'pointer' : 'default',
                transition: 'background 0.15s, transform 0.1s',
              }}
              onMouseEnter={e => { if (canSend) e.currentTarget.style.background = '#2563eb'; }}
              onMouseLeave={e => { if (canSend) e.currentTarget.style.background = '#3b82f6'; }}
              onMouseDown={e => { if (canSend) e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </XStack>
        </XStack>
      </YStack>
    </YStack>
  );
}
