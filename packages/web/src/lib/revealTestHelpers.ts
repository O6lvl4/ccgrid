import { RevealStateMachine, type Timer, type ScrollContainer } from './RevealStateMachine';

/**
 * Deterministic fake timer for DI — no real timers used in tests.
 */
export class FakeTimer implements Timer {
  private callbacks = new Map<number, { fn: () => void; interval: number; nextAt: number }>();
  private nextId = 1;
  private now = 0;

  setInterval(fn: () => void, ms: number): number {
    const id = this.nextId++;
    this.callbacks.set(id, { fn, interval: ms, nextAt: this.now + ms });
    return id;
  }

  clearInterval(id: number): void {
    this.callbacks.delete(id);
  }

  tick(ms: number): void {
    const target = this.now + ms;
    while (this.now < target) {
      let earliest = Infinity;
      for (const entry of this.callbacks.values()) {
        if (entry.nextAt < earliest) earliest = entry.nextAt;
      }

      if (earliest > target) {
        this.now = target;
        break;
      }

      this.now = earliest;

      const due = [...this.callbacks.entries()].filter(([, e]) => e.nextAt <= this.now);
      for (const [id, entry] of due) {
        entry.fn();
        if (this.callbacks.has(id)) {
          entry.nextAt = this.now + entry.interval;
        }
      }
    }
  }

  get activeCount(): number {
    return this.callbacks.size;
  }
}

/** Simple call counter — replaces vi.fn() */
export class CallCounter {
  count = 0;
  call = () => { this.count++; };
  reset() { this.count = 0; }
}

export function createFakeScroll(height = 1000): ScrollContainer {
  return { scrollHeight: height, scrollTop: 0 };
}

export function createMachine(opts: {
  chunksPerStep?: number;
  intervalMs?: number;
  timer?: FakeTimer;
  scroll?: ScrollContainer | null;
  counter?: CallCounter;
} = {}) {
  const timer = opts.timer ?? new FakeTimer();
  const scroll = 'scroll' in opts ? (opts.scroll ?? null) : createFakeScroll();
  const counter = opts.counter ?? new CallCounter();
  const machine = new RevealStateMachine({
    chunksPerStep: opts.chunksPerStep ?? 3,
    intervalMs: opts.intervalMs ?? 50,
    timer,
    getScrollContainer: () => scroll,
    onChange: counter.call,
  });
  return { machine, timer, scroll, counter };
}
