import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { StatusBadge } from './StatusBadge';
import { markdownComponents } from './CodeBlock';
import type { Teammate } from '@ccgrid/shared';

export function TeammateCard({ tm }: { tm: Teammate }) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = !!(tm.output || tm.transcriptPath);

  return (
    <YStack bg="$gray8" rounded="$2">
      {/* Header row */}
      <XStack
        tag="button"
        width="100%"
        ai="center"
        gap="$2"
        px="$2"
        py="$1.5"
        cursor={hasContent ? 'pointer' : 'default'}
        hoverStyle={hasContent ? { bg: '$gray7' } : {}}
        onPress={() => hasContent && setExpanded(!expanded)}
      >
        <StatusBadge status={tm.status} />
        <Text fontSize={12} fontFamily="monospace" color="$gray2" numberOfLines={1} flex={1}>
          {tm.name ?? tm.agentId.slice(0, 8)}
        </Text>
        <Text fontSize={12} color="$gray5" ml="auto" shrink={0}>
          {tm.agentType}
        </Text>
        {hasContent && (
          <Text fontSize={12} color="$gray5" shrink={0}>
            {expanded ? '\u25B2' : '\u25BC'}
          </Text>
        )}
      </XStack>

      {/* Expanded details */}
      {expanded && (
        <ScrollView maxHeight={240}>
          <YStack px="$2" pb="$2" pt="$1" gap="$1.5" borderTopWidth={1} borderTopColor="$gray7">
            {/* Detail rows */}
            <YStack gap="$0.5">
              <XStack gap="$2">
                <Text fontSize={11} color="$gray5" shrink={0}>
                  Agent ID
                </Text>
                <Text fontSize={11} color="$gray4" fontFamily="monospace" numberOfLines={1}>
                  {tm.agentId}
                </Text>
              </XStack>
              <XStack gap="$2">
                <Text fontSize={11} color="$gray5" shrink={0}>
                  Type
                </Text>
                <Text fontSize={11} color="$gray4">
                  {tm.agentType}
                </Text>
              </XStack>
              {tm.transcriptPath && (
                <XStack gap="$2">
                  <Text fontSize={11} color="$gray5" shrink={0}>
                    Transcript
                  </Text>
                  <Text
                    fontSize={11}
                    color="$gray4"
                    fontFamily="monospace"
                    numberOfLines={1}
                    title={tm.transcriptPath}
                  >
                    {tm.transcriptPath}
                  </Text>
                </XStack>
              )}
            </YStack>

            {/* Output markdown - kept as Tailwind prose since Tamagui doesn't have prose utilities */}
            {tm.output && (
              <div className="prose prose-xs prose-invert max-w-none prose-pre:bg-gray-900 prose-pre:text-[11px] prose-p:text-[11px] prose-p:text-gray-300 prose-headings:text-xs prose-headings:text-gray-200 prose-li:text-[11px] prose-code:text-blue-300">
                <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>{tm.output}</Markdown>
              </div>
            )}
          </YStack>
        </ScrollView>
      )}
    </YStack>
  );
}
