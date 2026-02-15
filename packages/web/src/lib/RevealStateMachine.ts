/**
 * Timer interface for DI — allows injecting fake timers in tests.
 */
export interface Timer {
  setInterval(fn: () => void, ms: number): number;
  clearInterval(id: number): void;
}

/**
 * Scroll container interface for DI — allows injecting fake scroll in tests.
 */
export interface ScrollContainer {
  scrollHeight: number;
  scrollTop: number;
}

/**
 * Callback to notify React (or other consumers) that state has changed.
 */
export type OnChangeCallback = () => void;

export interface RevealState {
  visibleCount: number;
  isRevealing: boolean;
}

export interface RevealStateMachineOptions {
  chunksPerStep: number;
  intervalMs: number;
  timer: Timer;
  getScrollContainer: () => ScrollContainer | null;
  onChange: OnChangeCallback;
}

/**
 * Pure state machine for progressive chunk reveal.
 *
 * Architecture:
 * - No React dependency — all state is managed internally.
 * - Timer and scroll container are injected via constructor (DI).
 * - Consumer provides an `onChange` callback to be notified of state changes.
 * - `update(totalChunks)` is called whenever the total chunk count changes.
 * - The machine handles: small content (instant), large content (progressive),
 *   streaming (instant append), and session switch (reset + progressive).
 */
export class RevealStateMachine {
  private readonly chunksPerStep: number;
  private readonly intervalMs: number;
  private readonly timer: Timer;
  private readonly getScrollContainer: () => ScrollContainer | null;
  private readonly onChange: OnChangeCallback;

  private visibleCount = 0;
  private fullyRevealed = false;
  private prevTotal = 0;
  private intervalId: number | null = null;
  private scrollHeightBefore = 0;

  constructor(opts: RevealStateMachineOptions) {
    this.chunksPerStep = opts.chunksPerStep;
    this.intervalMs = opts.intervalMs;
    this.timer = opts.timer;
    this.getScrollContainer = opts.getScrollContainer;
    this.onChange = opts.onChange;
  }

  /** Current state snapshot. */
  getState(): RevealState {
    return {
      visibleCount: this.visibleCount,
      isRevealing: !this.fullyRevealed && this.visibleCount < this.prevTotal,
    };
  }

  /**
   * Called whenever the total chunk count changes.
   * Handles all state transitions.
   */
  update(totalChunks: number): void {
    const prevTotal = this.prevTotal;
    this.prevTotal = totalChunks;

    if (totalChunks === 0) {
      this.handleEmpty();
      return;
    }

    if (this.tryInstantReveal(totalChunks)) return;
    if (this.trySessionSwitch(totalChunks, prevTotal)) return;
    if (this.tryStreamingAppend(totalChunks)) return;

    // Already revealing — interval will pick up new target
    if (this.intervalId !== null) return;

    // Need to start progressive reveal
    if (!this.fullyRevealed && this.visibleCount < totalChunks) {
      this.startInterval(totalChunks);
    }
  }

  /** Scroll position saved before a reveal step (for layout adjustment). */
  getScrollHeightBefore(): number {
    return this.scrollHeightBefore;
  }

  /** Clear the saved scroll height (call after adjusting scroll). */
  clearScrollHeightBefore(): void {
    this.scrollHeightBefore = 0;
  }

  /** Stop the interval and clean up. */
  dispose(): void {
    this.stopInterval();
  }

  private handleEmpty(): void {
    this.stopInterval();
    this.visibleCount = 0;
    this.fullyRevealed = false;
  }

  /** Small content: show everything immediately. Returns true if handled. */
  private tryInstantReveal(totalChunks: number): boolean {
    if (this.fullyRevealed || totalChunks > this.chunksPerStep || this.visibleCount !== 0) return false;
    this.visibleCount = totalChunks;
    this.fullyRevealed = true;
    this.stopInterval();
    this.onChange();
    return true;
  }

  /** Session switch: large jump while already revealed → reset. Returns true if handled. */
  private trySessionSwitch(totalChunks: number, prevTotal: number): boolean {
    const delta = totalChunks - prevTotal;
    if (!this.fullyRevealed || delta <= this.chunksPerStep * 2 || totalChunks <= this.chunksPerStep) return false;
    this.fullyRevealed = false;
    this.visibleCount = 0;
    this.stopInterval();
    this.startInterval(totalChunks);
    this.onChange();
    return true;
  }

  /** Streaming: small increase while fully revealed → show instantly. Returns true if handled. */
  private tryStreamingAppend(totalChunks: number): boolean {
    if (!this.fullyRevealed || this.visibleCount >= totalChunks) return false;
    this.visibleCount = totalChunks;
    this.onChange();
    return true;
  }

  private startInterval(target: number): void {
    this.stopInterval();

    this.intervalId = this.timer.setInterval(() => {
      if (this.fullyRevealed || this.visibleCount >= target) {
        this.fullyRevealed = true;
        this.stopInterval();
        return;
      }

      const el = this.getScrollContainer();
      if (el) {
        this.scrollHeightBefore = el.scrollHeight;
      }

      const next = Math.min(this.visibleCount + this.chunksPerStep, target);
      this.visibleCount = next;

      if (next >= target) {
        this.fullyRevealed = true;
        this.stopInterval();
      }

      this.onChange();
    }, this.intervalMs);
  }

  private stopInterval(): void {
    if (this.intervalId !== null) {
      this.timer.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
