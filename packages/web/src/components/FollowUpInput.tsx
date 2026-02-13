import { useState, useCallback, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { readFilesAsAttachments, FILE_ACCEPT } from '../utils/fileUtils';

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
    <div style={{
      width: '100%',
      boxSizing: 'border-box' as const,
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 1px 6px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        borderBottom: '1px solid #f0f1f3',
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: '#0ab9e6',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#3c4257',
          letterSpacing: 0.5,
          textTransform: 'uppercase' as const,
        }}>
          Follow-up
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 16px 14px' }}>
        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {attachedFiles.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  background: '#f5f7fa',
                  borderRadius: 12,
                  fontSize: 11,
                  color: '#5a6376',
                  fontWeight: 500,
                }}
              >
                <span>{f.type.startsWith('image/') ? '\uD83D\uDDBC' : f.type === 'application/pdf' ? '\uD83D\uDCC4' : '\uD83D\uDCDD'} {f.name}</span>
                <span
                  style={{ cursor: 'pointer', color: '#b0b8c4', fontSize: 13, lineHeight: 1, fontWeight: 400 }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#e5484d'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#b0b8c4'; }}
                  onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))}
                >
                  ×
                </span>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown as any}
          placeholder="追加の指示を入力..."
          disabled={sending}
          rows={3}
          style={{
            width: '100%',
            boxSizing: 'border-box' as const,
            minHeight: 64,
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#f9fafb',
            color: '#1a1d24',
            fontSize: 13,
            lineHeight: 1.5,
            fontFamily: 'inherit',
            resize: 'vertical' as const,
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#0ab9e6'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 4,
        }}>
          {/* Attach — icon-only, quiet */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            aria-label="Attach files"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 17,
              border: 'none',
              background: 'transparent',
              color: sending ? '#d1d5db' : '#8b95a3',
              fontSize: 18,
              cursor: sending ? 'default' : 'pointer',
              transition: 'background 0.18s, color 0.18s',
            }}
            onMouseEnter={e => { if (!sending) { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#555e6b'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = sending ? '#d1d5db' : '#8b95a3'; }}
          >
            +
          </button>

          {/* Right side: hint + send */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 11,
              color: '#b0b8c4',
              letterSpacing: 0.2,
              userSelect: 'none',
            }}>
              ⌘ Enter
            </span>
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
              onMouseDown={e => { if (canSend) { e.currentTarget.style.transform = 'scale(0.95)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(10,185,230,0.2)'; } }}
              onMouseUp={e => { if (canSend) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(10,185,230,0.35)'; } }}
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
