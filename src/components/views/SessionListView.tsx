import { useState } from 'react';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { useStore } from '../../store/useStore';
import { SessionConfig } from '../SessionConfig';
import { StatusBadge } from '../StatusBadge';
import type { Api } from '../../hooks/useApi';

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function SessionListView({ api }: { api: Api }) {
  const sessions = useStore(s => s.sessions);
  const navigate = useStore(s => s.navigate);
  const teammates = useStore(s => s.teammates);
  const tasks = useStore(s => s.tasks);
  const [showConfig, setShowConfig] = useState(true);

  const sessionList = Array.from(sessions.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <ScrollView flex={1}>
      <YStack maxWidth={720} alignSelf="center" width="100%" py="$3">
        {/* Create form */}
        <YStack px="$4" mb="$4">
          <XStack
            items="center"
            gap="$2"
            cursor="pointer"
            onPress={() => setShowConfig(!showConfig)}
            mb="$2"
          >
            <Text fontSize={11} color="$gray7">
              {showConfig ? '\u25BC' : '\u25B6'}
            </Text>
            <Text fontSize={13} fontWeight="600" color="$gray11">
              New Session
            </Text>
          </XStack>
          {showConfig && <SessionConfig api={api} />}
        </YStack>

        {/* Session list */}
        <YStack px="$4" gap="$3">
          <Text fontSize={11} fontWeight="600" color="$gray8" textTransform="uppercase" letterSpacing={0.5}>
            Recent Sessions ({sessionList.length})
          </Text>

          {sessionList.length === 0 ? (
            <YStack py="$6" items="center">
              <Text fontSize={13} color="$gray7">
                No sessions yet. Create one above to get started.
              </Text>
            </YStack>
          ) : (
            <YStack gap="$1">
              {sessionList.map(s => {
                const tmCount = Array.from(teammates.values()).filter(t => t.sessionId === s.id).length;
                const sessionTasks = tasks.get(s.id) ?? [];
                const doneTasks = sessionTasks.filter(t => t.status === 'completed').length;
                const isActive = s.status === 'running' || s.status === 'starting';

                return (
                  <YStack
                    key={s.id}
                    rounded="$3"
                    cursor="pointer"
                    hoverStyle={{ bg: '$gray3' }}
                    onPress={() => navigate({ view: 'session_detail', sessionId: s.id, tab: 'output' })}
                    px="$3"
                    py="$2.5"
                    gap="$1"
                  >
                    {/* Row 1: name + status + time */}
                    <XStack items="center" gap="$2">
                      <StatusBadge status={s.status} showLabel={false} />
                      <Text fontSize={13} fontWeight="500" color="$gray12" numberOfLines={1} flex={1}>
                        {s.name}
                      </Text>
                      <XStack gap="$2" items="center" shrink={0}>
                        <Text fontSize={11} color="$gray7" fontFamily="$mono">
                          {s.model.split('-').slice(1, 3).join(' ')}
                        </Text>
                        <Text fontSize={11} color="$gray8" fontFamily="$mono">
                          ${s.costUsd.toFixed(2)}
                        </Text>
                        {tmCount > 0 && (
                          <Text fontSize={11} color="$gray8">{tmCount} tm</Text>
                        )}
                        {sessionTasks.length > 0 && (
                          <Text fontSize={11} color="$gray8">{doneTasks}/{sessionTasks.length}</Text>
                        )}
                        <Text fontSize={11} color="$gray7">{timeAgo(s.createdAt)}</Text>
                      </XStack>
                    </XStack>

                    {/* Row 2: description + actions */}
                    <XStack items="center" pl="$4" gap="$2">
                      <Text fontSize={12} color="$gray9" numberOfLines={1} flex={1}>
                        {s.taskDescription}
                      </Text>
                      {isActive ? (
                        <Text
                          fontSize={11}
                          color="$red9"
                          cursor="pointer"
                          fontWeight="500"
                          hoverStyle={{ color: '$red10' }}
                          shrink={0}
                          onPress={(e: any) => { e.stopPropagation(); api.stopSession(s.id).catch(console.error); }}
                        >
                          Stop
                        </Text>
                      ) : (
                        <Text
                          fontSize={11}
                          color="$gray7"
                          cursor="pointer"
                          hoverStyle={{ color: '$red9' }}
                          shrink={0}
                          onPress={(e: any) => { e.stopPropagation(); api.deleteSession(s.id).catch(console.error); }}
                        >
                          Delete
                        </Text>
                      )}
                    </XStack>
                  </YStack>
                );
              })}
            </YStack>
          )}
        </YStack>
      </YStack>
    </ScrollView>
  );
}
