import { describe, it, expect } from 'vitest';
import { RevealStateMachine, type Timer, type ScrollContainer } from './RevealStateMachine';

// ---------------------------------------------------------------------------
// Helpers: Fake implementations for DI (no mocks)
// ---------------------------------------------------------------------------

class FakeTimer implements Timer {
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
class CallCounter {
  count = 0;
  call = () => { this.count++; };
  reset() { this.count = 0; }
}

function createFakeScroll(height = 1000): ScrollContainer {
  return { scrollHeight: height, scrollTop: 0 };
}

function createMachine(opts: {
  chunksPerStep?: number;
  intervalMs?: number;
  timer?: FakeTimer;
  scroll?: ScrollContainer | null;
  counter?: CallCounter;
} = {}) {
  const timer = opts.timer ?? new FakeTimer();
  const scroll = 'scroll' in opts ? (opts.scroll ?? null) : createFakeScroll();
  const counter = opts.counter ?? new CallCounter();
  const machine = new RevealStateMachine(
    opts.chunksPerStep ?? 3,
    opts.intervalMs ?? 50,
    timer,
    () => scroll,
    counter.call,
  );
  return { machine, timer, scroll, counter };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RevealStateMachine', () => {
  // ==============================
  // 初期状態
  // ==============================
  describe('初期状態', () => {
    it('初期状態はvisibleCount=0, isRevealing=false', () => {
      const { machine } = createMachine();
      const state = machine.getState();
      expect(state.visibleCount).toBe(0);
      expect(state.isRevealing).toBe(false);
    });
  });

  // ==============================
  // 小コンテンツ即時表示
  // ==============================
  describe('小コンテンツ即時表示', () => {
    it('totalChunks <= chunksPerStep の場合、即座に全表示', () => {
      const { machine, counter } = createMachine({ chunksPerStep: 3 });
      machine.update(2);
      const state = machine.getState();
      expect(state.visibleCount).toBe(2);
      expect(state.isRevealing).toBe(false);
      expect(counter.count).toBe(1);
    });

    it('totalChunks === 1 の場合も即座に全表示', () => {
      const { machine } = createMachine({ chunksPerStep: 3 });
      machine.update(1);
      expect(machine.getState().visibleCount).toBe(1);
      expect(machine.getState().isRevealing).toBe(false);
    });

    it('totalChunks === chunksPerStep ちょうどの場合も即座に全表示', () => {
      const { machine } = createMachine({ chunksPerStep: 3 });
      machine.update(3);
      expect(machine.getState().visibleCount).toBe(3);
      expect(machine.getState().isRevealing).toBe(false);
    });
  });

  // ==============================
  // 大コンテンツ段階表示
  // ==============================
  describe('大コンテンツ段階表示', () => {
    it('totalChunks > chunksPerStep の場合、段階的に表示', () => {
      const { machine, timer, counter } = createMachine({ chunksPerStep: 3, intervalMs: 50 });
      machine.update(10);

      expect(machine.getState().visibleCount).toBe(0);
      expect(machine.getState().isRevealing).toBe(true);

      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(3);
      expect(machine.getState().isRevealing).toBe(true);

      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(6);
      expect(machine.getState().isRevealing).toBe(true);

      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(9);
      expect(machine.getState().isRevealing).toBe(true);

      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(10);
      expect(machine.getState().isRevealing).toBe(false);

      expect(counter.count).toBe(4);
    });

    it('インターバル完了後はタイマーがクリアされる', () => {
      const timer = new FakeTimer();
      const { machine } = createMachine({ chunksPerStep: 3, intervalMs: 50, timer });
      machine.update(4);

      expect(timer.activeCount).toBe(1);

      timer.tick(50);
      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(4);
      expect(timer.activeCount).toBe(0);
    });
  });

  // ==============================
  // ストリーミング（小さな増加）
  // ==============================
  describe('ストリーミング', () => {
    it('完全表示後に少しずつ増える場合、即座に反映', () => {
      const { machine, counter } = createMachine({ chunksPerStep: 3 });

      machine.update(3);
      expect(machine.getState().visibleCount).toBe(3);
      counter.reset();

      machine.update(4);
      expect(machine.getState().visibleCount).toBe(4);
      expect(machine.getState().isRevealing).toBe(false);
      expect(counter.count).toBe(1);

      machine.update(5);
      expect(machine.getState().visibleCount).toBe(5);
      expect(counter.count).toBe(2);
    });

    it('段階表示完了後のストリーミングも即座に反映', () => {
      const timer = new FakeTimer();
      const { machine } = createMachine({ chunksPerStep: 3, intervalMs: 50, timer });

      machine.update(6);
      timer.tick(50); // 3
      timer.tick(50); // 6 → 完了

      expect(machine.getState().visibleCount).toBe(6);
      expect(machine.getState().isRevealing).toBe(false);

      machine.update(7);
      expect(machine.getState().visibleCount).toBe(7);
      expect(machine.getState().isRevealing).toBe(false);
    });
  });

  // ==============================
  // セッション切替（大きなジャンプ）
  // ==============================
  describe('セッション切替', () => {
    it('大きなジャンプでリセット→段階表示を再開', () => {
      const timer = new FakeTimer();
      const { machine, counter } = createMachine({ chunksPerStep: 3, intervalMs: 50, timer });

      machine.update(3);
      expect(machine.getState().visibleCount).toBe(3);
      expect(machine.getState().isRevealing).toBe(false);
      counter.reset();

      // セッション切替: 3 → 12 (delta=9 > 3*2=6)
      machine.update(12);
      expect(machine.getState().visibleCount).toBe(0);
      expect(machine.getState().isRevealing).toBe(true);
      expect(counter.count).toBeGreaterThan(0);

      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(3);
      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(6);
      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(9);
      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(12);
      expect(machine.getState().isRevealing).toBe(false);
    });

    it('小さなジャンプ（delta <= chunksPerStep * 2）ではリセットしない', () => {
      const { machine } = createMachine({ chunksPerStep: 3 });

      machine.update(3);
      expect(machine.getState().visibleCount).toBe(3);

      machine.update(8);
      expect(machine.getState().visibleCount).toBe(8);
      expect(machine.getState().isRevealing).toBe(false);
    });
  });

  // ==============================
  // 空コンテンツ
  // ==============================
  describe('空コンテンツ', () => {
    it('totalChunks=0 の場合、visibleCount=0', () => {
      const { machine } = createMachine();
      machine.update(0);
      expect(machine.getState().visibleCount).toBe(0);
      expect(machine.getState().isRevealing).toBe(false);
    });

    it('表示中にtotalChunks=0 になった場合、リセット', () => {
      const timer = new FakeTimer();
      const { machine } = createMachine({ chunksPerStep: 3, timer });

      machine.update(10);
      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(3);

      machine.update(0);
      expect(machine.getState().visibleCount).toBe(0);
      expect(machine.getState().isRevealing).toBe(false);
    });
  });

  // ==============================
  // 空→大コンテンツ
  // ==============================
  describe('空→大コンテンツ', () => {
    it('0から大コンテンツへ遷移すると段階表示開始', () => {
      const timer = new FakeTimer();
      const { machine } = createMachine({ chunksPerStep: 3, intervalMs: 50, timer });

      machine.update(0);
      machine.update(9);

      expect(machine.getState().visibleCount).toBe(0);
      expect(machine.getState().isRevealing).toBe(true);

      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(3);
      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(6);
      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(9);
      expect(machine.getState().isRevealing).toBe(false);
    });
  });

  // ==============================
  // スクロール位置保持
  // ==============================
  describe('スクロール位置保持', () => {
    it('段階表示時にscrollHeightBeforeが保存される', () => {
      const timer = new FakeTimer();
      const scroll = createFakeScroll(500);
      const { machine } = createMachine({ chunksPerStep: 3, intervalMs: 50, timer, scroll });

      machine.update(10);
      timer.tick(50);

      expect(machine.getScrollHeightBefore()).toBe(500);

      machine.clearScrollHeightBefore();
      expect(machine.getScrollHeightBefore()).toBe(0);
    });

    it('scrollContainerがnullでもクラッシュしない', () => {
      const timer = new FakeTimer();
      const { machine } = createMachine({
        chunksPerStep: 3,
        intervalMs: 50,
        timer,
        scroll: null,
      });

      machine.update(10);
      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(3);
      expect(machine.getScrollHeightBefore()).toBe(0);
    });
  });

  // ==============================
  // dispose
  // ==============================
  describe('dispose', () => {
    it('disposeでインターバルがクリアされる', () => {
      const timer = new FakeTimer();
      const { machine } = createMachine({ chunksPerStep: 3, intervalMs: 50, timer });

      machine.update(10);
      expect(timer.activeCount).toBe(1);

      machine.dispose();
      expect(timer.activeCount).toBe(0);

      timer.tick(200);
      expect(machine.getState().visibleCount).toBe(0);
    });
  });

  // ==============================
  // 無限ループ防止
  // ==============================
  describe('無限ループ防止', () => {
    it('完了後にonChangeが際限なく呼ばれない', () => {
      const timer = new FakeTimer();
      const counter = new CallCounter();
      const { machine } = createMachine({ chunksPerStep: 3, intervalMs: 50, timer, counter });

      machine.update(3);
      const callCount = counter.count;

      timer.tick(500);
      expect(counter.count).toBe(callCount);
    });

    it('同じtotalChunksで複数回updateしてもonChangeが増えない', () => {
      const counter = new CallCounter();
      const { machine } = createMachine({ chunksPerStep: 3, counter });

      machine.update(2);
      const count1 = counter.count;

      machine.update(2);
      machine.update(2);
      machine.update(2);
      expect(counter.count).toBe(count1);
    });
  });

  // ==============================
  // 段階表示中に新チャンク追加
  // ==============================
  describe('段階表示中のストリーミング', () => {
    it('段階表示中にtotalChunksが増えてもクラッシュしない', () => {
      const timer = new FakeTimer();
      const { machine } = createMachine({ chunksPerStep: 3, intervalMs: 50, timer });

      machine.update(10);
      timer.tick(50); // visibleCount = 3

      machine.update(12);
      timer.tick(50); // 6
      timer.tick(50); // 9
      timer.tick(50); // 10 → 完了（旧target）

      machine.update(12);
      expect(machine.getState().visibleCount).toBe(12);
    });
  });

  // ==============================
  // chunksPerStep=1 のエッジケース
  // ==============================
  describe('chunksPerStep=1', () => {
    it('1チャンクずつ段階表示', () => {
      const timer = new FakeTimer();
      const { machine } = createMachine({ chunksPerStep: 1, intervalMs: 50, timer });

      machine.update(1);
      expect(machine.getState().visibleCount).toBe(1);

      machine.update(0);
      machine.update(3);

      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(1);
      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(2);
      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(3);
      expect(machine.getState().isRevealing).toBe(false);
    });
  });
});
