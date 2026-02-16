import { useState, useCallback, memo, type ReactNode } from 'react';
import { TeammateAvatar } from './Avatars';
import { MemoMarkdown } from './MemoMarkdown';
import type { Teammate } from '@ccgrid/shared';

// ---- StatusBadge ----
export function StatusBadge({ status }: { status: string }) {
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

// ---- CopyButton ----
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button type="button" onClick={handleCopy} aria-label="Copy"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 26, height: 26, borderRadius: 6,
        border: 'none', background: copied ? '#d1fae5' : 'transparent',
        color: copied ? '#065f46' : '#9ca3af', fontSize: 13,
        cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!copied) { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; } }}
      onMouseLeave={e => { if (!copied) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; } }}
    >{copied ? '✓' : '⧉'}</button>
  );
}

// ---- CardHeader ----
export function CardHeader({ icon, title, subtitle, status, copyContent, collapsed, onToggle }: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  status?: string;
  copyContent?: string;
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
        {status && <StatusBadge status={status} />}
      </div>
      {copyContent && <CopyButton text={copyContent} />}
    </div>
  );
}

// ---- PulseWorking ----
export function PulseWorking() {
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

// ---- ContentCard ----
export const BORDER_COLORS: Record<string, string> = {
  '$gray5': '#e5e7eb',
  '$blue5': '#93c5fd',
  '$indigo5': '#a5b4fc',
};

function CardBody({ content, children }: { content?: string; children?: ReactNode }) {
  if (children) return <>{children}</>;
  if (content) return <MemoMarkdown content={content} />;
  return <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 13 }}>No output yet</span>;
}

export const ContentCard = memo(function ContentCard({ icon, title, subtitle, status, content, copyContent, borderColorOverride, children }: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  status?: string;
  content?: string;
  copyContent?: string;
  borderColorOverride?: string;
  children?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const borderColor = BORDER_COLORS[borderColorOverride ?? '$gray5'] ?? '#e5e7eb';
  const textToCopy = copyContent ?? content;
  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden', backgroundColor: '#ffffff' }}>
      <CardHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        status={status}
        copyContent={textToCopy}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />
      {!collapsed && (
        <div style={{ padding: '0 12px 12px' }}>
          <CardBody content={content}>{children}</CardBody>
        </div>
      )}
    </div>
  );
});

// ---- TeammateCard ----
export const TeammateCard = memo(function TeammateCard({ teammate }: { teammate: Teammate }) {
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
        copyContent={teammate.output}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />
      {!collapsed && (
        <div style={{ padding: '0 12px 12px' }}>
          {teammate.output && (
            <MemoMarkdown content={teammate.output} />
          )}
          {!teammate.output && isWorking && (
            <PulseWorking />
          )}
          {!teammate.output && !isWorking && (
            <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 12 }}>No output</span>
          )}
        </div>
      )}
    </div>
  );
});

// ---- TimelineConnector ----
export function TimelineConnector() {
  return (
    <div style={{
      width: 2,
      height: 12,
      backgroundColor: '#d1d5db',
      marginLeft: 20,
    }} />
  );
}
