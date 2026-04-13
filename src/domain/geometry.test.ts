import { describe, it, expect } from 'vitest';
import { distance, distanceToLineSegment, pressPosition } from './geometry';

describe('distance', () => {
  it('misst euklidisch', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('distanceToLineSegment', () => {
  it('misst senkrecht aufs Segment, wenn der Lotpunkt dazwischen liegt', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    expect(distanceToLineSegment({ x: 5, y: 3 }, a, b)).toBeCloseTo(3, 5);
  });

  it('misst zum näheren Endpunkt, wenn der Lotpunkt außerhalb liegt', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    expect(distanceToLineSegment({ x: 13, y: 4 }, a, b)).toBeCloseTo(5, 5);
    expect(distanceToLineSegment({ x: -3, y: 4 }, a, b)).toBeCloseTo(5, 5);
  });

  it('fällt auf euklidische Distanz zurück, wenn a===b', () => {
    const a = { x: 5, y: 5 };
    expect(distanceToLineSegment({ x: 2, y: 1 }, a, a)).toBeCloseTo(5, 5);
  });

  it('Punkt auf dem Segment hat Distanz 0', () => {
    expect(
      distanceToLineSegment({ x: 3, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
    ).toBeCloseTo(0, 5);
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
