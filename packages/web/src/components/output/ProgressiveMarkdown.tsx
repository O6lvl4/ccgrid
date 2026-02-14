import { memo, useMemo } from 'react';
import { splitIntoChunks } from '../../utils/outputParser';
import { useProgressiveReveal } from '../../hooks/useProgressiveReveal';
import { MemoMarkdown, proseClass } from './MemoMarkdown';

const CHUNKS_PER_STEP = 3;

// ---------------------------------------------------------------------------
// Skeleton shown while visibleCount === 0
// ---------------------------------------------------------------------------
const SKELETON_WIDTHS = [0.92, 0.78, 0.85, 0.6, 0.88, 0.45];

function RevealSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {SKELETON_WIDTHS.map((w, i) => (
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

// ---------------------------------------------------------------------------
// "Loading earlier output…" banner
// ---------------------------------------------------------------------------
function LoadingBanner() {
  return (
    <div
      style={{
        padding: '8px 0',
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: 12,
        fontStyle: 'italic',
      }}
    >
      Loading earlier output…
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProgressiveMarkdown
// ---------------------------------------------------------------------------

/**
 * Renders markdown content progressively in chunks.
 *
 * - Content is split into ~3 000-char chunks at paragraph boundaries.
 * - On mount with large content, shows a skeleton then reveals chunks
 *   from the end (newest first) via `useProgressiveReveal`.
 * - Each chunk is rendered by its own `<MemoMarkdown>` so unchanged
 *   chunks are never re-rendered.
 * - Streaming: once fully revealed, new chunks appear instantly.
 */
export const ProgressiveMarkdown = memo(function ProgressiveMarkdown({
  content,
  scrollRef,
}: {
  content: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const chunks = useMemo(() => splitIntoChunks(content), [content]);

  const { visibleCount } = useProgressiveReveal(
    chunks.length,
    CHUNKS_PER_STEP,
    scrollRef,
  );

  if (chunks.length === 0) return null;

  if (visibleCount === 0) {
    return <RevealSkeleton />;
  }

  const startIndex = Math.max(0, chunks.length - visibleCount);

  return (
    <div className={proseClass}>
      {startIndex > 0 && <LoadingBanner />}
      {chunks.slice(startIndex).map((chunk, i) => (
        <MemoMarkdown key={startIndex + i} content={chunk} bare />
      ))}
    </div>
  );
});
