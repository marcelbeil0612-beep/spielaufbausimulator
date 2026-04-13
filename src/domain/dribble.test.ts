import { describe, it, expect } from 'vitest';
import {
  DRIBBLE_SPEED_MPS,
  dribbleDuration,
  dribblePlayerPosition,
  dribbleProgress,
  isDribbleComplete,
  type Dribble,
} from './dribble';

function makeDribble(elapsed: number, duration: number): Dribble {
  return {
    playerId: 'p1',
    start: { x: 10, y: 10 },
    end: { x: 30, y: 50 },
    speed: 'jog',
    duration,
    elapsed,
    baseline: { homePlayers: [], awayPlayers: [] },
  };
}

describe('dribble', () => {
  it('dribbleDuration = Distanz / Geschwindigkeit', () => {
    const d = dribbleDuration({ x: 0, y: 0 }, { x: 0, y: 10 }, 'jog');
    expect(d).toBeCloseTo(10 / DRIBBLE_SPEED_MPS.jog, 5);
  });

  it('progress skaliert linear zwischen 0 und 1', () => {
    const d = makeDribble(1, 4);
    expect(dribbleProgress(d)).toBeCloseTo(0.25, 5);
  });

  it('progress wird bei Überschreitung auf 1 gekappt', () => {
    const d = makeDribble(10, 4);
    expect(dribbleProgress(d)).toBe(1);
  });

  it('playerPosition interpoliert linear zwischen start und end', () => {
    const d = makeDribble(2, 4);
    const pos = dribblePlayerPosition(d);
    expect(pos.x).toBeCloseTo(20, 5);
    expect(pos.y).toBeCloseTo(30, 5);
  });

  it('isDribbleComplete greift ab elapsed ≥ duration', () => {
    expect(isDribbleComplete(makeDribble(3, 4))).toBe(false);
    expect(isDribbleComplete(makeDribble(4, 4))).toBe(true);
    expect(isDribbleComplete(makeDribble(5, 4))).toBe(true);
  });
});
