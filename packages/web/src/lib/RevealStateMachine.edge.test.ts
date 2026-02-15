import { describe, it, expect } from 'vitest';
import { FakeTimer, CallCounter, createFakeScroll, createMachine } from './revealTestHelpers';

describe('RevealStateMachine エッジケース', () => {
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
      const { machine } = createMachine({ chunksPerStep: 3, intervalMs: 50, timer, scroll: null });

      machine.update(10);
      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(3);
      expect(machine.getScrollHeightBefore()).toBe(0);
    });
  });

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

  describe('段階表示中のストリーミング', () => {
    it('段階表示中にtotalChunksが増えてもクラッシュしない', () => {
      const timer = new FakeTimer();
      const { machine } = createMachine({ chunksPerStep: 3, intervalMs: 50, timer });

      machine.update(10);
      timer.tick(50);

      machine.update(12);
      timer.tick(50);
      timer.tick(50);
      timer.tick(50);

      machine.update(12);
      expect(machine.getState().visibleCount).toBe(12);
    });
  });

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
