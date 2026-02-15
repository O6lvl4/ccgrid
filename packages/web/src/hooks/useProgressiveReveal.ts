import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { RevealStateMachine } from '../lib/RevealStateMachine';
import type { RevealState } from '../lib/RevealStateMachine';

const REVEAL_INTERVAL_MS = 50;

export type { RevealState as RevealResult };

/**
 * React hook wrapper around RevealStateMachine.
 *
 * - Creates the state machine once (via ref).
 * - Calls `machine.update(totalChunks)` on every render.
 * - Subscribes to `onChange` to trigger React re-renders via `useState`.
 * - Handles scroll-position adjustment via `useLayoutEffect`.
 */
export function useProgressiveReveal(
  totalChunks: number,
  chunksPerStep: number,
  scrollContainerRef: React.RefObject<HTMLElement | null>,
): RevealState {
  const [, forceRender] = useState(0);
  const machineRef = useRef<RevealStateMachine | null>(null);

  const onChange = useCallback(() => {
    forceRender(n => n + 1);
  }, []);

  // Lazily create the machine
  if (!machineRef.current) {
    machineRef.current = new RevealStateMachine({
      chunksPerStep,
      intervalMs: REVEAL_INTERVAL_MS,
      timer: { setInterval: window.setInterval.bind(window), clearInterval: window.clearInterval.bind(window) },
      getScrollContainer: () => scrollContainerRef.current,
      onChange,
    });
  }

  const machine = machineRef.current;

  // Update the machine with current total
  machine.update(totalChunks);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      machineRef.current?.dispose();
    };
  }, []);

  // Scroll-position adjustment after DOM commit
  useLayoutEffect(() => {
    const saved = machine.getScrollHeightBefore();
    if (!saved) return;
    machine.clearScrollHeightBefore();

    const el = scrollContainerRef.current;
    if (!el) return;

    const diff = el.scrollHeight - saved;
    if (diff > 0) {
      el.scrollTop += diff;
    }
  });

  return machine.getState();
}
