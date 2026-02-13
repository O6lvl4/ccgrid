import { useEffect, useRef, useMemo, memo } from 'react';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/shallow';
import { FollowUpInput } from '../FollowUpInput';
import { parseSegments } from '../../utils/outputParser';
import { LeadAvatar, UserAvatar, FollowUpAvatar } from '../output/Avatars';
import { StatusBadge, PulseWorking, ContentCard, TeammateCard, TimelineConnector } from '../output/ContentCards';
import type { FollowUpImage } from '../../store/useStore';
import type { Teammate } from '@ccgrid/shared';

const STABLE_EMPTY_MAP = new Map<number, FollowUpImage[]>();

export const OutputTab = memo(function OutputTab({ sessionId }: { sessionId: string }) {
  const session = useStore(s => s.sessions.get(sessionId));
  const output = useStore(s => s.leadOutputs.get(sessionId) ?? '');
  const imageMap = useStore(s => s.followUpImages.get(sessionId) ?? STABLE_EMPTY_MAP);
  const allTeammates = useStore(useShallow((s) => {
    const result: Teammate[] = [];
    for (const tm of s.teammates.values()) {
      if (tm.sessionId === sessionId) result.push(tm);
    }
    return result;
  }));
  const scrollRef = useRef<HTMLDivElement>(null);

  const segments = useMemo(() => parseSegments(output), [output]);

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
              const images = imageMap.get(i);
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
