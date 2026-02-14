import { useEffect, useLayoutEffect, useRef, useMemo, useState, useCallback, memo } from 'react';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/shallow';
import { FollowUpInput } from '../FollowUpInput';
import { parseSegments, splitIntoChunks } from '../../utils/outputParser';
import { MemoMarkdown, proseClass } from '../output/MemoMarkdown';
import { LeadAvatar, UserAvatar, FollowUpAvatar } from '../output/Avatars';
import { StatusBadge, PulseWorking, ContentCard, TeammateCard, TimelineConnector } from '../output/ContentCards';
import type { Teammate } from '@ccgrid/shared';

const INITIAL_CHUNKS = 3;

// ---- ProgressiveMarkdown ----
// Splits content into ~3000-char chunks and reveals them progressively.
// On session switch: renders only the last N chunks immediately,
// then adds earlier chunks via requestIdleCallback.
// During streaming: only the last chunk re-renders (earlier chunks are memoized).

function ProgressiveMarkdown({ content, scrollRef }: {
  content: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const chunks = useMemo(() => splitIntoChunks(content), [content]);
  const prevScrollHeight = useRef(0);

  // Mount with large content → show nothing (deferred).
  // Mount with small/empty content → show all (streaming start).
  const [revealedStart, setRevealedStart] = useState(() => {
    const c = splitIntoChunks(content);
    return c.length > INITIAL_CHUNKS ? c.length : 0;
  });

  // State phases:
  //   deferred  (revealedStart >= chunks.length && chunks.length > INITIAL_CHUNKS): show nothing
  //   revealing (revealedStart > 0 && revealedStart < chunks.length): loading progressively
  //   complete  (revealedStart === 0): show everything
  const isDeferred = revealedStart >= chunks.length && chunks.length > INITIAL_CHUNKS;
  const isRevealing = revealedStart > 0 && revealedStart < chunks.length;

  // Phase 1: deferred → after first paint, begin showing last N chunks
  useEffect(() => {
    if (!isDeferred) return;
    const id = requestAnimationFrame(() => {
      setRevealedStart(Math.max(0, chunks.length - INITIAL_CHUNKS));
    });
    return () => cancelAnimationFrame(id);
  }, [isDeferred, chunks.length]);

  // Phase 2: revealing → progressively add earlier chunks when idle
  useEffect(() => {
    if (!isRevealing) return;
    const id = requestIdleCallback(() => {
      if (scrollRef.current) {
        prevScrollHeight.current = scrollRef.current.scrollHeight;
      }
      setRevealedStart(prev => Math.max(0, prev - 2));
    });
    return () => cancelIdleCallback(id);
  }, [isRevealing, revealedStart, scrollRef]);

  // Streaming: keep new chunks visible (only when fully revealed)
  useEffect(() => {
    setRevealedStart(prev => {
      if (prev === 0) return 0;
      if (prev >= chunks.length) return prev; // Still deferred
      return Math.min(prev, Math.max(0, chunks.length - INITIAL_CHUNKS));
    });
  }, [chunks.length]);

  // Scroll adjustment when revealing earlier content (prevents viewport jump)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !prevScrollHeight.current) return;
    const diff = el.scrollHeight - prevScrollHeight.current;
    if (diff > 0) {
      el.scrollTop += diff;
    }
    prevScrollHeight.current = 0;
  }, [revealedStart, scrollRef]);

  if (chunks.length === 0) return null;

  if (isDeferred) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0.92, 0.78, 0.85, 0.6, 0.88, 0.45].map((w, i) => (
          <div
            key={i}
            className="skeleton-pulse"
            style={{
              height: 12,
              borderRadius: 4,
              background: '#f0f1f3',
              width: `${w * 100}%`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
        <style>{`
          .skeleton-pulse {
            animation: skeleton-fade 1.2s ease-in-out infinite;
          }
          @keyframes skeleton-fade {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={proseClass}>
      {isRevealing && (
        <div style={{
          padding: '8px 0',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: 12,
          fontStyle: 'italic',
        }}>
          Loading earlier output…
        </div>
      )}
      {chunks.slice(revealedStart).map((chunk, i) => (
        <MemoMarkdown key={revealedStart + i} content={chunk} bare />
      ))}
    </div>
  );
}

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
          <ContentCard icon={<FollowUpAvatar />} title={`Follow-up #${index + 1}`} status={followUpStatus} borderColorOverride="$blue5">
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
  const isNearBottomRef = useRef(true);

  const cachedSegments = useRef<ReturnType<typeof parseSegments>>({ initial: '', followUps: [] });
  const segments = useMemo(() => {
    if (!visible) return cachedSegments.current;
    const parsed = parseSegments(output);
    cachedSegments.current = parsed;
    return parsed;
  }, [output, visible]);

  const isStreaming = session?.status === 'running';

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  useEffect(() => {
    if (!visible || !isNearBottomRef.current) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
    });
  }, [output, allTeammates, visible]);

  if (!session) return null;

  const isCompleted = session.status === 'completed';
  const hasTeammates = allTeammates.length > 0;

  let leadStatus: string;
  if (hasTeammates || segments.followUps.length > 0) {
    leadStatus = segments.followUps.length === 0 && isStreaming ? 'running' : 'completed';
  } else {
    leadStatus = session.status;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', backgroundColor: '#f9fafb' }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
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
              status={leadStatus}
            >
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
