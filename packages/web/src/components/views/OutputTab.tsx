import { useEffect, useRef, useMemo, useCallback, useState, memo } from 'react';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/shallow';
import { FollowUpInput } from '../FollowUpInput';
import { parseSegments } from '../../utils/outputParser';
import { ProgressiveMarkdown } from '../output/ProgressiveMarkdown';
import { LeadAvatar, UserAvatar, FollowUpAvatar } from '../output/Avatars';
import { StatusBadge, PulseWorking, ContentCard, TeammateCard, TimelineConnector } from '../output/ContentCards';
import type { Teammate } from '@ccgrid/shared';

// ---- LeadStreamingIndicator ----

function LeadStreamingIndicator({ show }: { show: boolean }) {
  if (!show) return null;
  return (
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
  );
}

// ---- FollowUpEntry ----

interface FollowUp { userPrompt?: string; response?: string }

function FollowUpEntry({ fu, index, isLast, isStreaming, scrollRef }: {
  fu: FollowUp; index: number; isLast: boolean; isStreaming: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const followUpStatus = isLast && isStreaming ? 'running' : 'completed';
  return (
    <div>
      {fu.userPrompt && (
        <>
          <TimelineConnector />
          <ContentCard icon={<UserAvatar />} title="You" content={fu.userPrompt} borderColorOverride="$indigo5" />
        </>
      )}
      {fu.response && (
        <>
          <TimelineConnector />
          <ContentCard icon={<FollowUpAvatar />} title={`Follow-up #${index + 1}`} status={followUpStatus} borderColorOverride="$blue5" copyContent={fu.response}>
            <ProgressiveMarkdown content={fu.response} scrollRef={scrollRef} />
          </ContentCard>
        </>
      )}
      {!fu.response && isLast && isStreaming && (
        <>
          <TimelineConnector />
          <div style={{ border: '1px solid #93c5fd', borderRadius: 8, overflow: 'hidden', padding: 12, backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 4 }}>
              <FollowUpAvatar />
              <span style={{ color: '#111827', fontWeight: 600, fontSize: 13 }}>Follow-up #{index + 1}</span>
              <StatusBadge status="running" />
            </div>
            <PulseWorking />
          </div>
        </>
      )}
    </div>
  );
}

// ---- ActiveTeammateBar ----

function ActiveTeammateBar({ teammates, sessionId }: { teammates: Teammate[]; sessionId: string }) {
  const navigate = useStore(s => s.navigate);
  return (
    <>
      <TimelineConnector />
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
        padding: '8px 12px', borderRadius: 10,
        background: '#f0f9ff', border: '1px solid #bae6fd',
      }}>
        <span style={{ color: '#64748b', fontWeight: 600, fontSize: 11, letterSpacing: 0.3, textTransform: 'uppercase' as const }}>
          Active
        </span>
        {teammates.map(tm => (
          <ActiveTeammateChip key={tm.agentId} teammate={tm} sessionId={sessionId} navigate={navigate} />
        ))}
      </div>
      <style>{`@keyframes teammate-pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
    </>
  );
}

function ActiveTeammateChip({ teammate, sessionId, navigate }: {
  teammate: Teammate; sessionId: string; navigate: (route: { view: 'teammate_detail'; sessionId: string; agentId: string }) => void;
}) {
  const dotColor = teammate.status === 'working' ? '#22c55e' : '#f59e0b';
  return (
    <button type="button"
      onClick={() => navigate({ view: 'teammate_detail', sessionId, agentId: teammate.agentId })}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 12,
        border: 'none', background: '#fff',
        fontSize: 12, fontWeight: 600, color: '#1e40af',
        cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#e0f2fe'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
    >
      <div style={{ width: 6, height: 6, borderRadius: 3, background: dotColor, animation: 'teammate-pulse 1.5s ease-in-out infinite' }} />
      {teammate.name ?? teammate.agentId.slice(0, 8)}
    </button>
  );
}

// ---- ScrollToBottomButton ----

function ScrollToBottomButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Scroll to bottom"
      style={{
        position: 'absolute', bottom: 16, right: 24,
        width: 36, height: 36, borderRadius: 18,
        border: 'none', background: '#1f2937', color: '#fff',
        fontSize: 16, cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: 0.85, transition: 'opacity 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '0.85'; }}
    >↓</button>
  );
}

// ---- helpers ----

function computeLeadStatus(sessionStatus: string, hasTeammates: boolean, hasFollowUps: boolean, isStreaming: boolean): string {
  if (hasTeammates || hasFollowUps) {
    return !hasFollowUps && isStreaming ? 'running' : 'completed';
  }
  return sessionStatus;
}

// ---- OutputTab ----

export const OutputTab = memo(function OutputTab({ sessionId, visible }: { sessionId: string; visible: boolean }) {
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const cachedSegments = useRef<ReturnType<typeof parseSegments>>({ initial: '', followUps: [] });
  const segments = useMemo(() => {
    if (!visible) return cachedSegments.current;
    const parsed = parseSegments(output);
    cachedSegments.current = parsed;
    return parsed;
  }, [output, visible]);

  const isStreaming = session?.status === 'running';

  const activeTeammates = useMemo(
    () => allTeammates.filter(t => t.status === 'working' || t.status === 'starting'),
    [allTeammates],
  );

  // Track scroll position with hysteresis to avoid flickering
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(prev => {
      if (!prev && dist > 120) return true;
      if (prev && dist < 40) return false;
      return prev;
    });
  }, []);

  // Auto-scroll when content height changes (covers streaming, progressive reveal, teammates, etc.)
  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;
    const observer = new ResizeObserver(() => {
      if (!visible) return;
      const el = scrollRef.current;
      if (!el) return;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
        el.scrollTo(0, el.scrollHeight);
      }
    });
    observer.observe(contentEl);
    return () => observer.disconnect();
  }, [visible]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    setShowScrollBtn(false);
  }, []);

  if (!session) return null;

  const hasTeammates = allTeammates.length > 0;
  const leadStatus = computeLeadStatus(session.status, hasTeammates, segments.followUps.length > 0, isStreaming);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', backgroundColor: '#f9fafb' }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '16px 0', minHeight: 0 }}
      >
        <div style={{ width: '100%', padding: '0 16px' }}>
          <div ref={contentRef}>
            {/* 1. 初回 Lead 出力 */}
            <ContentCard icon={<LeadAvatar />} title="Lead" status={leadStatus} copyContent={segments.initial}>
              <ProgressiveMarkdown content={segments.initial} scrollRef={scrollRef} />
            </ContentCard>

            {/* 2. チームメイトカード群 */}
            {allTeammates.map(tm => (
              <div key={tm.agentId}>
                <TimelineConnector />
                <TeammateCard teammate={tm} />
              </div>
            ))}

            {/* 3. フォローアップ（ユーザーメッセージ + AI応答） */}
            {segments.followUps.map((fu, i) => (
              <FollowUpEntry
                key={`followup-${i}`}
                fu={fu}
                index={i}
                isLast={i === segments.followUps.length - 1}
                isStreaming={isStreaming}
                scrollRef={scrollRef}
              />
            ))}

            {/* 4. ストリーミング中 */}
            <LeadStreamingIndicator show={isStreaming && segments.followUps.length === 0 && !hasTeammates && !!segments.initial} />

            {/* 5. 稼働中チームメイトバー */}
            {activeTeammates.length > 0 && (
              <ActiveTeammateBar teammates={activeTeammates} sessionId={sessionId} />
            )}

            {/* 6. フォローアップ入力 */}
            {session.status !== 'starting' && (
              <>
                <TimelineConnector />
                <FollowUpInput sessionId={sessionId} />
              </>
            )}
          </div>
        </div>
      </div>
      {showScrollBtn && <ScrollToBottomButton onClick={scrollToBottom} />}
    </div>
  );
});
