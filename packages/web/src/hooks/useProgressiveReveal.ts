import { useRef, useEffect, useLayoutEffect, useState } from 'react';

/**
 * How many milliseconds between reveal steps.
 * 50 ms ≈ 20 fps — gives React enough time to render each step.
 */
const REVEAL_INTERVAL_MS = 50;

export interface RevealResult {
  /** How many chunks (from the end) to show right now. */
  visibleCount: number;
  /** True while the reveal is still in progress. */
  isRevealing: boolean;
}

/**
 * Progressive reveal hook.
 *
 * Architecture:
 * - Uses a mutable ref (`visibleCountRef`) as the source of truth for how
 *   many chunks are visible. This avoids React state-queue timing issues.
 * - A `setInterval` drives the reveal. It reads/writes the ref directly
 *   and triggers re-renders via a force-update counter.
 * - The interval only depends on `totalChunks` — it does NOT depend on
 *   `visibleCount`, so parent re-renders cannot break the reveal chain.
 * - Once fully revealed, a `fullyRevealedRef` flag is set. Subsequent
 *   increases in `totalChunks` (streaming) are shown instantly.
 * - If `totalChunks` jumps by more than `chunksPerStep * 2` while already
 *   fully revealed (e.g. session switch with cached output), the reveal
 *   resets and runs progressively again.
 *
 * @param totalChunks  Total number of content chunks available.
 * @param chunksPerStep  How many chunks to add per interval tick.
 * @param scrollContainerRef  Ref to the scrollable container for scroll-position adjustment.
 */
export function useProgressiveReveal(
  totalChunks: number,
  chunksPerStep: number,
  scrollContainerRef: React.RefObject<HTMLElement | null>,
): RevealResult {
  const visibleCountRef = useRef(0);
  const fullyRevealedRef = useRef(false);
  const scrollHeightBeforeRef = useRef(0);
  const prevTotalRef = useRef(totalChunks);
  const [, forceRender] = useState(0);

  // --- Initialization (runs during render, before effects) ---

  // Small content: show everything immediately
  if (
    !fullyRevealedRef.current &&
    totalChunks > 0 &&
    totalChunks <= chunksPerStep &&
    visibleCountRef.current === 0
  ) {
    visibleCountRef.current = totalChunks;
    fullyRevealedRef.current = true;
  }

  // Detect large content jump (session switch with cached output).
  // Reset to progressive reveal instead of rendering everything at once.
  const delta = totalChunks - prevTotalRef.current;
  if (
    fullyRevealedRef.current &&
    delta > chunksPerStep * 2 &&
    totalChunks > chunksPerStep
  ) {
    fullyRevealedRef.current = false;
    visibleCountRef.current = 0;
  }

  // Streaming: small increase while already fully revealed → show instantly
  if (
    fullyRevealedRef.current &&
    visibleCountRef.current < totalChunks
  ) {
    visibleCountRef.current = totalChunks;
  }

  prevTotalRef.current = totalChunks;

  // --- setInterval-based progressive reveal ---

  useEffect(() => {
    if (fullyRevealedRef.current || totalChunks === 0) return;

    const target = totalChunks;

    const id = setInterval(() => {
      // Already done (e.g. streaming sync set it)
      if (fullyRevealedRef.current) {
        clearInterval(id);
        return;
      }

      const current = visibleCountRef.current;
      if (current >= target) {
        fullyRevealedRef.current = true;
        clearInterval(id);
        return;
      }

      // Save scroll height BEFORE React adds DOM nodes above viewport
      const el = scrollContainerRef.current;
      if (el) {
        scrollHeightBeforeRef.current = el.scrollHeight;
      }

      const next = Math.min(current + chunksPerStep, target);
      visibleCountRef.current = next;

      if (next >= target) {
        fullyRevealedRef.current = true;
        clearInterval(id);
      }

      forceRender(n => n + 1);
    }, REVEAL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [totalChunks, chunksPerStep, scrollContainerRef]);

  // --- Scroll-position adjustment ---
  // After React commits DOM changes, check if content was added above the
  // current viewport and adjust scrollTop to prevent a visible jump.

  useLayoutEffect(() => {
    const saved = scrollHeightBeforeRef.current;
    if (!saved) return;
    scrollHeightBeforeRef.current = 0;

    const el = scrollContainerRef.current;
    if (!el) return;

    const diff = el.scrollHeight - saved;
    if (diff > 0) {
      el.scrollTop += diff;
    }
  });

  return {
    visibleCount: Math.min(visibleCountRef.current, totalChunks),
    isRevealing: !fullyRevealedRef.current && visibleCountRef.current < totalChunks,
  };
}
