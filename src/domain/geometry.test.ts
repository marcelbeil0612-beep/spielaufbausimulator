import { describe, it, expect } from 'vitest';
import { distance, pressPosition } from './geometry';

describe('distance', () => {
  it('misst euklidisch', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('pressPosition', () => {
  it('positioniert den Pressor auf stopShort zum Ziel', () => {
    const pressor = { x: 10, y: 0 };
    const target = { x: 0, y: 0 };
    const next = pressPosition(pressor, target, 2);
    expect(next.x).toBeCloseTo(2, 5);
    expect(next.y).toBeCloseTo(0, 5);
  });

  it('bleibt stehen, wenn Pressor bereits näher als stopShort', () => {
    const pressor = { x: 1, y: 0 };
    const target = { x: 0, y: 0 };
    const next = pressPosition(pressor, target, 2);
    expect(next).toEqual(pressor);
  });
});
