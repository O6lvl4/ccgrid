import { useState, useCallback, useRef, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { useStore } from '../store/useStore';
import { readFilesAsAttachments, FILE_ACCEPT } from '../utils/fileUtils';
import { FileChip } from './FileChip';
import { extractPastedFiles } from '../utils/pasteUtils';

interface InputTheme {
  dot: string; border: string; focus: string; bg: string;
  label: string; placeholder: string; animation: string;
  sendLabel: string; accent: string; accentHover: string;
  shadow: string; shadowHover: string; shadowActive: string;
}

const THEME_QUESTION: InputTheme = {
  dot: '#f59e0b', border: '#fde68a', focus: '#f59e0b', bg: '#fffef5',
  label: 'Agent Question', placeholder: '回答を入力...',
  animation: 'pulse-dot 1.5s ease-in-out infinite', sendLabel: 'Reply',
  accent: '#f59e0b', accentHover: '#e08e0a',
  shadow: 'rgba(245,158,11,0.25)', shadowHover: 'rgba(245,158,11,0.35)', shadowActive: 'rgba(245,158,11,0.2)',
};

const THEME_FOLLOWUP: InputTheme = {
  dot: '#0ab9e6', border: '#e5e7eb', focus: '#0ab9e6', bg: '#f9fafb',
  label: 'Follow-up', placeholder: '追加の指示を入力...',
  animation: 'none', sendLabel: 'Send',
  accent: '#0ab9e6', accentHover: '#09a8d2',
  shadow: 'rgba(10,185,230,0.25)', shadowHover: 'rgba(10,185,230,0.35)', shadowActive: 'rgba(10,185,230,0.2)',
};

const PULSE_CSS = `@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.4); }
}`;

function usePendingQuestion(sessionId: string) {
  const pendingQuestions = useStore(s => s.pendingQuestions);
  return useMemo(() => {
    for (const q of pendingQuestions.values()) {
      if (q.sessionId === sessionId) return q;
    }
    return null;
  }, [pendingQuestions, sessionId]);
}

export function FollowUpInput({ sessionId }: { sessionId: string }) {
  const api = useApi();
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingQuestion = usePendingQuestion(sessionId);
  const respondToQuestion = useStore(s => s.respondToQuestion);
  const isQuestion = !!pendingQuestion;
  const theme = isQuestion ? THEME_QUESTION : THEME_FOLLOWUP;
  const canSend = !!(prompt.trim() || attachedFiles.length > 0) && !sending;

  const handleSend = useCallback(async () => {
    const text = prompt.trim();
    if ((!text && attachedFiles.length === 0) || sending) return;
    setSending(true);
    setError(null);
    try {
      if (pendingQuestion) {
        respondToQuestion(pendingQuestion.requestId, text || '(no answer)');
      } else {
        const files = attachedFiles.length > 0
          ? await readFilesAsAttachments(attachedFiles)
          : undefined;
        await api.continueSession(sessionId, text || '添付ファイルを確認してください', files);
        setAttachedFiles([]);
      }
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }, [api, sessionId, prompt, sending, attachedFiles, pendingQuestion, respondToQuestion]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const files = extractPastedFiles(e);
    if (files.length > 0) setAttachedFiles(prev => [...prev, ...files]);
  }, []);

  return (
    <div style={{
      width: '100%', boxSizing: 'border-box' as const, background: '#fff',
      borderRadius: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid #f0f1f3' }}>
        <div style={{ width: 6, height: 6, borderRadius: 3, background: theme.dot, flexShrink: 0, animation: theme.animation }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#3c4257', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>{theme.label}</span>
      </div>
      <div style={{ padding: '12px 16px 14px' }}>
        {pendingQuestion && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 10, fontSize: 13, lineHeight: 1.5, color: '#92400e' }}>
            {pendingQuestion.question}
          </div>
        )}
        {!isQuestion && attachedFiles.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'flex-end' }}>
            {attachedFiles.map((f, i) => (
              <FileChip key={`${f.name}-${i}`} file={f} onRemove={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))} />
            ))}
          </div>
        )}
        <textarea
          value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={handleKeyDown} onPaste={handlePaste}
          placeholder={theme.placeholder} disabled={sending} rows={3}
          style={{
            width: '100%', boxSizing: 'border-box' as const, minHeight: 64, padding: '10px 12px',
            borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.bg,
            color: '#1a1d24', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit',
            resize: 'vertical' as const, outline: 'none', transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = theme.focus; }}
          onBlur={e => { e.currentTarget.style.borderColor = theme.border; }}
        />
        <input ref={fileInputRef} type="file" multiple accept={FILE_ACCEPT} style={{ display: 'none' }}
          onChange={e => { if (e.target.files) { setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = ''; } }}
        />
        {error && <div style={{ color: '#dc2626', fontSize: 12, padding: '4px 0' }}>{error}</div>}
        <InputToolbar sending={sending} canSend={canSend} theme={theme}
          onAttach={isQuestion ? undefined : () => fileInputRef.current?.click()} onSend={handleSend} />
      </div>
      <style>{PULSE_CSS}</style>
    </div>
  );
}

function InputToolbar({ sending, canSend, onAttach, onSend, theme }: {
  sending: boolean; canSend: boolean; onAttach?: () => void; onSend: () => void; theme: InputTheme;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
      {onAttach ? <AttachButton sending={sending} onAttach={onAttach} /> : <div style={{ width: 34 }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: '#b0b8c4', letterSpacing: 0.2, userSelect: 'none' }}>⌘ Enter</span>
        <SendButton canSend={canSend} sending={sending} theme={theme} onSend={onSend} />
      </div>
    </div>
  );
}

function AttachButton({ sending, onAttach }: { sending: boolean; onAttach: () => void }) {
  return (
    <button type="button" onClick={onAttach} disabled={sending} aria-label="Attach files"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 34, height: 34, borderRadius: 17, border: 'none', background: 'transparent',
        color: sending ? '#d1d5db' : '#8b95a3', fontSize: 18,
        cursor: sending ? 'default' : 'pointer', transition: 'background 0.18s, color 0.18s',
      }}
      onMouseEnter={e => { if (!sending) { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#555e6b'; } }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = sending ? '#d1d5db' : '#8b95a3'; }}
    >+</button>
  );
}

function SendButton({ canSend, sending, theme, onSend }: {
  canSend: boolean; sending: boolean; theme: InputTheme; onSend: () => void;
}) {
  const label = sending ? '...' : theme.sendLabel;
  return (
    <button type="button" onClick={onSend} disabled={!canSend}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 34, minWidth: 72, paddingLeft: 18, paddingRight: 18, borderRadius: 17,
        border: 'none', background: canSend ? theme.accent : '#e8eaed',
        color: canSend ? '#fff' : '#b0b8c4', fontSize: 13, fontWeight: 700, letterSpacing: 0.4,
        cursor: canSend ? 'pointer' : 'default',
        transition: 'background 0.2s, transform 0.12s, box-shadow 0.2s',
        boxShadow: canSend ? `0 2px 8px ${theme.shadow}` : 'none',
      }}
      onMouseEnter={e => { if (canSend) { e.currentTarget.style.background = theme.accentHover; e.currentTarget.style.boxShadow = `0 4px 14px ${theme.shadowHover}`; } }}
      onMouseLeave={e => { if (canSend) { e.currentTarget.style.background = theme.accent; e.currentTarget.style.boxShadow = `0 2px 8px ${theme.shadow}`; } e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseDown={e => { if (canSend) { e.currentTarget.style.transform = 'scale(0.95)'; e.currentTarget.style.boxShadow = `0 1px 4px ${theme.shadowActive}`; } }}
      onMouseUp={e => { if (canSend) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 4px 14px ${theme.shadowHover}`; } }}
    >{label}</button>
  );
}
