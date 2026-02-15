import { describe, it, expect } from 'vitest';
import { FakeTimer, CallCounter, createMachine } from './revealTestHelpers';

describe('RevealStateMachine', () => {
  describe('初期状態', () => {
    it('初期状態はvisibleCount=0, isRevealing=false', () => {
      const { machine } = createMachine();
      const state = machine.getState();
      expect(state.visibleCount).toBe(0);
      expect(state.isRevealing).toBe(false);
    });
  });

  describe('小コンテンツ即時表示', () => {
    it('totalChunks <= chunksPerStep の場合、即座に全表示', () => {
      const { machine, counter } = createMachine({ chunksPerStep: 3 });
      machine.update(2);
      expect(machine.getState().visibleCount).toBe(2);
      expect(machine.getState().isRevealing).toBe(false);
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

  describe('大コンテンツ段階表示', () => {
    it('totalChunks > chunksPerStep の場合、段階的に表示', () => {
      const { machine, timer, counter } = createMachine({ chunksPerStep: 3, intervalMs: 50 });
      machine.update(10);

      expect(machine.getState().visibleCount).toBe(0);
      expect(machine.getState().isRevealing).toBe(true);

      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(3);
      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(6);
      timer.tick(50);
      expect(machine.getState().visibleCount).toBe(9);
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

  describe('ストリーミング', () => {
    it('完全表示後に少しずつ増える場合、即座に反映', () => {
      const { machine, counter } = createMachine({ chunksPerStep: 3 });
      machine.update(3);
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
      timer.tick(50);
      timer.tick(50);

      expect(machine.getState().visibleCount).toBe(6);
      expect(machine.getState().isRevealing).toBe(false);

      machine.update(7);
      expect(machine.getState().visibleCount).toBe(7);
    });
  });

  describe('セッション切替', () => {
    it('大きなジャンプでリセット→段階表示を再開', () => {
      const timer = new FakeTimer();
      const { machine, counter } = createMachine({ chunksPerStep: 3, intervalMs: 50, timer });

      machine.update(3);
      counter.reset();

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

    it('小さなジャンプではリセットしない', () => {
      const { machine } = createMachine({ chunksPerStep: 3 });
      machine.update(3);
      machine.update(8);
      expect(machine.getState().visibleCount).toBe(8);
      expect(machine.getState().isRevealing).toBe(false);
    });
  });

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
});
