import { useEffect, useRef, useMemo, useCallback, memo } from 'react';
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
            {session.status !== 'starting' && (
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
