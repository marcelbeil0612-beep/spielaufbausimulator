import { describe, it, expect } from 'vitest';
import {
  FACING_AWAY,
  FACING_HOME,
  frontWedgePoints,
  toSvgCoord,
  PITCH_SVG_HEIGHT,
} from './pitchGeometry';

describe('toSvgCoord', () => {
  it('Heim-Tor (y=0) liegt unten in SVG', () => {
    const { cy } = toSvgCoord({ x: 50, y: 0 });
    expect(cy).toBe(PITCH_SVG_HEIGHT);
  });

  it('Gast-Tor (y=100) liegt oben in SVG', () => {
    const { cy } = toSvgCoord({ x: 50, y: 100 });
    expect(cy).toBe(0);
  });
});

function parsePoints(s: string): { x: number; y: number }[] {
  return s
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x: x ?? 0, y: y ?? 0 };
    });
}

describe('frontWedgePoints', () => {
  it('Heim-Keil zeigt in SVG nach oben (kleineres cy als Körper)', () => {
    const cx = 34;
    const cy = 60;
    const r = 2.2;
    const points = parsePoints(frontWedgePoints(cx, cy, r, FACING_HOME));
    expect(points).toHaveLength(3);
    const tip = points[0]!;
    // Tip sitzt außerhalb des Körpers, in Richtung Gegner-Tor (cy kleiner).
    expect(tip.y).toBeLessThan(cy - r);
    expect(tip.x).toBeCloseTo(cx, 5);
  });

  it('Gast-Keil zeigt in SVG nach unten (größeres cy)', () => {
    const cx = 34;
    const cy = 40;
    const r = 2.2;
    const points = parsePoints(frontWedgePoints(cx, cy, r, FACING_AWAY));
    const tip = points[0]!;
    expect(tip.y).toBeGreaterThan(cy + r);
    expect(tip.x).toBeCloseTo(cx, 5);
  });

  it('Basispunkte sind symmetrisch zur Blickachse', () => {
    const cx = 34;
    const cy = 50;
    const r = 2.2;
    const [, left, right] = parsePoints(
      frontWedgePoints(cx, cy, r, FACING_HOME),
    );
    expect(left!.y).toBeCloseTo(right!.y, 5);
    expect(cx - left!.x).toBeCloseTo(right!.x - cx, 5);
  });
});
