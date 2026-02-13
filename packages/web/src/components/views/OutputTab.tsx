import { useEffect, useRef, useState, useMemo, memo, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/shallow';
import { FollowUpInput } from '../FollowUpInput';
import { applyTwemojiToElement } from '../../utils/twemoji';
import { markdownComponents } from '../CodeBlock';
import { getAttachmentRounds } from '../../utils/followUpAttachments';
import type { Teammate } from '@ccgrid/shared';

// Stable plugin arrays (avoid recreating on every render)
const remarkPlugins = [remarkGfm, remarkBreaks];

const SEPARATOR = '\n\n<!-- follow-up -->\n\n';
const LEGACY_SEPARATOR = '\n\n---\n\n';

const proseClass = 'prose prose-sm max-w-none prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200 prose-code:text-blue-600 prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-a:text-blue-600';

// Strip SDK internal tags (e.g. <tool_use_error>...</ tool_use_error>) from output
const SDK_TAG_RE = /<\/?(?:tool_use_error|antml:[a-z_]+|system-reminder)[^>]*>|<(?:tool_use_error|antml:[a-z_]+|system-reminder)[^>]*\/>/g;
function cleanSdkOutput(text: string): string {
  return text.replace(SDK_TAG_RE, '').replace(/\n{3,}/g, '\n\n');
}

/** Memoized Markdown — renders fast with native emoji, then applies Twemoji after paint */
const MemoMarkdown = memo(function MemoMarkdown({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Apply Twemoji after the browser paints the native-emoji version
    const id = requestAnimationFrame(() => {
      if (ref.current) applyTwemojiToElement(ref.current);
    });
    return () => cancelAnimationFrame(id);
  }, [content]);

  return (
    <div ref={ref} className={proseClass}>
      <Markdown remarkPlugins={remarkPlugins} components={markdownComponents}>
        {cleanSdkOutput(content)}
      </Markdown>
    </div>
  );
});

// ---- チームメイト用のカラーパレット ----
const AVATAR_COLORS = [
  { bg: '#3b82f6', fg: '#ffffff' },  // blue
  { bg: '#10b981', fg: '#ffffff' },  // green
  { bg: '#f59e0b', fg: '#1a1a1a' },  // amber
  { bg: '#a855f7', fg: '#ffffff' },  // purple
  { bg: '#f43f5e', fg: '#ffffff' },  // rose
  { bg: '#06b6d4', fg: '#1a1a1a' },  // cyan
  { bg: '#84cc16', fg: '#1a1a1a' },  // lime
  { bg: '#f97316', fg: '#ffffff' },  // orange
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ---- アバターアイコン (28px) ----
const AVATAR_SIZE = 28;

function Avatar({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      minWidth: AVATAR_SIZE,
      minHeight: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: bg,
      flexShrink: 0,
    }}>
      <span style={{
        color: fg,
        fontSize: 13,
        fontWeight: 800,
        lineHeight: 1,
        userSelect: 'none',
      }}>
        {label}
      </span>
    </div>
  );
}

function LeadAvatar() {
  return <Avatar label="★" bg="#8b5cf6" fg="#ffffff" />;
}

function UserAvatar() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      minWidth: AVATAR_SIZE,
      minHeight: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: '#6366f1',
      flexShrink: 0,
    }}>
      <span style={{
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 800,
        lineHeight: 1,
        userSelect: 'none',
      }}>
        You
      </span>
    </div>
  );
}

function TeammateAvatar({ name }: { name: string }) {
  const idx = hashString(name) % AVATAR_COLORS.length;
  const { bg, fg } = AVATAR_COLORS[idx];
  const initial = name.charAt(0).toUpperCase();
  return <Avatar label={initial} bg={bg} fg={fg} />;
}

function FollowUpAvatar() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      minWidth: AVATAR_SIZE,
      minHeight: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: '#3b82f6',
      flexShrink: 0,
    }}>
      <span style={{
        color: '#ffffff',
        fontSize: 13,
        fontWeight: 800,
        lineHeight: 1,
        userSelect: 'none',
        position: 'relative',
        top: 1,
      }}>
        ↩
      </span>
    </div>
  );
}

// ---- StatusBadge (ライトモード) ----
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    starting: { bg: '#fef3c7', fg: '#92400e' },
    running: { bg: '#d1fae5', fg: '#065f46' },
    working: { bg: '#d1fae5', fg: '#065f46' },
    idle: { bg: '#e0e7ff', fg: '#3730a3' },
    completed: { bg: '#f3f4f6', fg: '#6b7280' },
    stopped: { bg: '#f3f4f6', fg: '#6b7280' },
    error: { bg: '#fee2e2', fg: '#991b1b' },
  };
  const { bg, fg } = colors[status] ?? colors.stopped;
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 8px',
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 600,
      backgroundColor: bg,
      color: fg,
    }}>
      {status}
    </span>
  );
}

// ---- CardHeader (ライトモード) ----
function CardHeader({ icon, title, subtitle, status, collapsed, onToggle }: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  status?: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#9ca3af', fontSize: 11, userSelect: 'none' }}>
          {collapsed ? '▶' : '▼'}
        </span>
        {icon}
        <span style={{ color: '#111827', fontWeight: 600, fontSize: 13 }}>{title}</span>
        {subtitle && (
          <span style={{ color: '#9ca3af', fontSize: 11 }}>{subtitle}</span>
        )}
      </div>
      {status && <StatusBadge status={status} />}
    </div>
  );
}

// ---- PulseWorking ----
function PulseWorking() {
  return (
    <div
      className="pulse-text"
      style={{
        color: '#9ca3af',
        fontSize: 12,
        fontStyle: 'italic',
        padding: '0 12px 8px',
      }}
    >
      Working...
      <style>{`
        .pulse-text { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}

// ---- ContentCard (ライトモード) ----
const BORDER_COLORS: Record<string, string> = {
  '$gray5': '#e5e7eb',
  '$blue5': '#93c5fd',
  '$indigo5': '#a5b4fc',
};

const ContentCard = memo(function ContentCard({ icon, title, subtitle, status, content, borderColorOverride, children }: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  status?: string;
  content: string;
  borderColorOverride?: string;
  children?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const borderColor = BORDER_COLORS[borderColorOverride ?? '$gray5'] ?? '#e5e7eb';
  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden', backgroundColor: '#ffffff' }}>
      <CardHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        status={status}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />
      {!collapsed && (
        <div style={{ padding: '0 12px 12px' }}>
          {content ? (
            <MemoMarkdown content={content} />
          ) : (
            <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 13 }}>No output yet</span>
          )}
          {children}
        </div>
      )}
    </div>
  );
});

// ---- TeammateCard ----
const TeammateCard = memo(function TeammateCard({ teammate }: { teammate: Teammate }) {
  const [collapsed, setCollapsed] = useState(false);
  const displayName = teammate.name ?? teammate.agentType ?? teammate.agentId;
  const isWorking = (teammate.status === 'starting' || teammate.status === 'working') && !teammate.output;

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', backgroundColor: '#ffffff' }}>
      <CardHeader
        icon={<TeammateAvatar name={displayName} />}
        title={displayName}
        subtitle={teammate.name ? teammate.agentType : undefined}
        status={teammate.status}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />
      {!collapsed && (
        <div style={{ padding: '0 12px 12px' }}>
          {teammate.output ? (
            <MemoMarkdown content={teammate.output} />
          ) : isWorking ? (
            <PulseWorking />
          ) : (
            <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 12 }}>No output</span>
          )}
        </div>
      )}
    </div>
  );
});

// ---- タイムラインの縦線コネクタ ----
function TimelineConnector() {
  return (
    <div style={{
      width: 2,
      height: 12,
      backgroundColor: '#d1d5db',
      marginLeft: 20,
    }} />
  );
}

// ---- OutputTab 本体 ----
export const OutputTab = memo(function OutputTab({ sessionId }: { sessionId: string }) {
  const session = useStore(s => s.sessions.get(sessionId));
  const output = useStore(s => s.leadOutputs.get(sessionId) ?? '');
  const allTeammates = useStore(useShallow((s) => {
    const result: Teammate[] = [];
    for (const tm of s.teammates.values()) {
      if (tm.sessionId === sessionId) result.push(tm);
    }
    return result;
  }));
  const scrollRef = useRef<HTMLDivElement>(null);

  const segments = useMemo(() => {
    if (!output) return { initial: '', followUps: [] as { userPrompt: string; response: string }[] };

    let parts: string[];
    if (output.includes(SEPARATOR)) {
      parts = output.split(SEPARATOR);
    } else if (output.includes(LEGACY_SEPARATOR)) {
      parts = output.split(LEGACY_SEPARATOR);
    } else {
      parts = [output];
    }

    const followUps: { userPrompt: string; response: string }[] = [];
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;
      const lines = part.split('\n');
      const quoteLines: string[] = [];
      let restStart = 0;
      for (let j = 0; j < lines.length; j++) {
        if (lines[j].startsWith('> ')) {
          quoteLines.push(lines[j].slice(2));
          restStart = j + 1;
        } else if (quoteLines.length > 0) {
          break;
        } else {
          break;
        }
      }
      const userPrompt = quoteLines.join('\n');
      const response = lines.slice(restStart).join('\n').trim();
      followUps.push({ userPrompt, response });
    }

    return {
      initial: parts[0] ?? '',
      followUps,
    };
  }, [output]);

  const isStreaming = session?.status === 'running';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output, allTeammates]);

  if (!session) return null;

  const isCompleted = session.status === 'completed';
  const hasTeammates = allTeammates.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', backgroundColor: '#f9fafb' }}>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 0',
          minHeight: 0,
        }}
      >
        <div style={{ width: '100%', padding: '0 16px' }}>
          <div>
            {/* 1. 初回 Lead 出力 */}
            <ContentCard
              icon={<LeadAvatar />}
              title="Lead"
              status={hasTeammates || segments.followUps.length > 0
                ? (segments.followUps.length === 0 && isStreaming ? 'running' : 'completed')
                : session.status}
              content={segments.initial}
            />

            {/* 2. チームメイトカード群 */}
            {allTeammates.map(tm => (
              <div key={tm.agentId}>
                <TimelineConnector />
                <TeammateCard teammate={tm} />
              </div>
            ))}

            {/* 3. フォローアップ（ユーザーメッセージ + AI応答） */}
            {segments.followUps.map((fu, i) => {
              const isLast = i === segments.followUps.length - 1;
              const followUpStatus = isLast && isStreaming ? 'running' : 'completed';
              const attachmentRounds = getAttachmentRounds(sessionId);
              const images = attachmentRounds[i];
              return (
                <div key={`followup-${i}`}>
                  {fu.userPrompt && (
                    <>
                      <TimelineConnector />
                      <ContentCard
                        icon={<UserAvatar />}
                        title="You"
                        content={fu.userPrompt}
                        borderColorOverride="$indigo5"
                      >
                        {images && images.length > 0 && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                            {images.map((img, j) => (
                              <img
                                key={j}
                                src={img.dataUrl}
                                alt={img.name}
                                style={{
                                  maxWidth: 200,
                                  maxHeight: 150,
                                  borderRadius: 10,
                                  objectFit: 'cover',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </ContentCard>
                    </>
                  )}
                  {fu.response && (
                    <>
                      <TimelineConnector />
                      <ContentCard
                        icon={<FollowUpAvatar />}
                        title={`Follow-up #${i + 1}`}
                        status={followUpStatus}
                        content={fu.response}
                        borderColorOverride="$blue5"
                      />
                    </>
                  )}
                  {!fu.response && isLast && isStreaming && (
                    <>
                      <TimelineConnector />
                      <div style={{ border: '1px solid #93c5fd', borderRadius: 8, overflow: 'hidden', padding: 12, backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 4 }}>
                          <FollowUpAvatar />
                          <span style={{ color: '#111827', fontWeight: 600, fontSize: 13 }}>Follow-up #{i + 1}</span>
                          <StatusBadge status="running" />
                        </div>
                        <PulseWorking />
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* 4. ストリーミング中 */}
            {isStreaming && segments.followUps.length === 0 && !hasTeammates && segments.initial && (
              <>
                <TimelineConnector />
                <div style={{ border: '1px solid #93c5fd', borderRadius: 8, overflow: 'hidden', padding: 12, backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 4 }}>
                    <LeadAvatar />
                    <span style={{ color: '#111827', fontWeight: 600, fontSize: 13 }}>Lead</span>
                    <StatusBadge status="running" />
                  </div>
                  <PulseWorking />
                </div>
              </>
            )}

            {/* 5. フォローアップ入力 */}
            {isCompleted && (
              <>
                <TimelineConnector />
                <FollowUpInput sessionId={sessionId} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
