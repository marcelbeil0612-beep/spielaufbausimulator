import { describe, it, expect } from 'vitest';
import {
  FACING_AWAY,
  FACING_HOME,
  PITCH_SVG_HEIGHT,
  PITCH_SVG_WIDTH,
  RECEIVER_ARRIVAL_SIDE_LABELS,
  RECEIVER_BODY_SHAPE_LABELS,
  RECEIVER_CONTINUATION_LABELS,
  deriveReceiverCueHome,
  deriveHolderFacingHome,
  deriveReceiverFacingHome,
  facingFromTo,
  frontWedgePoints,
  mixFacing,
  normalizeFacing,
  toSvgCoord,
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

describe('normalizeFacing', () => {
  it('liefert Einheitsvektor', () => {
    const v = normalizeFacing({ dx: 3, dy: 4 });
    expect(Math.hypot(v.dx, v.dy)).toBeCloseTo(1, 6);
  });

  it('Nullvektor → FACING_HOME (sicherer Default)', () => {
    expect(normalizeFacing({ dx: 0, dy: 0 })).toEqual(FACING_HOME);
  });

  it('NaN → FACING_HOME', () => {
    expect(normalizeFacing({ dx: Number.NaN, dy: 1 })).toEqual(FACING_HOME);
  });
});

describe('mixFacing', () => {
  it('Gewicht 1/0 lässt die dominante Richtung unverändert', () => {
    const m = mixFacing({ dx: 0.6, dy: -0.8 }, 1, FACING_AWAY, 0);
    expect(m.dx).toBeCloseTo(0.6, 6);
    expect(m.dy).toBeCloseTo(-0.8, 6);
  });

  it('entgegengesetzte Richtungen gleich gewichtet → Default', () => {
    expect(mixFacing(FACING_HOME, 0.5, FACING_AWAY, 0.5)).toEqual(FACING_HOME);
  });

  it('Ergebnis ist normiert', () => {
    const m = mixFacing(FACING_HOME, 0.7, { dx: 1, dy: 0 }, 0.3);
    expect(Math.hypot(m.dx, m.dy)).toBeCloseTo(1, 6);
  });
});

describe('facingFromTo', () => {
  it('zeigt korrekt zum Zielpunkt', () => {
    const v = facingFromTo({ cx: 0, cy: 0 }, { cx: 10, cy: 0 });
    expect(v).toEqual({ dx: 1, dy: 0 });
  });

  it('gleicher Punkt → FACING_HOME (Fallback)', () => {
    expect(facingFromTo({ cx: 5, cy: 5 }, { cx: 5, cy: 5 })).toEqual(
      FACING_HOME,
    );
  });
});

describe('deriveHolderFacingHome', () => {
  it('in der Mitte: nahezu reine Vorwärtsrichtung', () => {
    const f = deriveHolderFacingHome({ cx: PITCH_SVG_WIDTH / 2, cy: 80 });
    expect(f.dx).toBeCloseTo(0, 5);
    expect(f.dy).toBeLessThan(-0.9);
  });

  it('auf linkem Flügel: lehnt nach rechts zur Mitte', () => {
    const f = deriveHolderFacingHome({ cx: 8, cy: 80 });
    expect(f.dx).toBeGreaterThan(0);
    expect(f.dy).toBeLessThan(0);
  });

  it('auf rechtem Flügel: lehnt nach links zur Mitte', () => {
    const f = deriveHolderFacingHome({ cx: PITCH_SVG_WIDTH - 8, cy: 80 });
    expect(f.dx).toBeLessThan(0);
    expect(f.dy).toBeLessThan(0);
  });

  it('Ergebnis ist immer ein Einheitsvektor', () => {
    const f = deriveHolderFacingHome({ cx: 5, cy: 40 });
    expect(Math.hypot(f.dx, f.dy)).toBeCloseTo(1, 6);
  });
});

describe('deriveReceiverFacingHome', () => {
  it('Empfänger deutlich VOR dem Ball schaut nie komplett zurück', () => {
    // Empfänger weit upfield (cy klein in SVG), Ball nahe eigenem Tor (cy groß).
    const f = deriveReceiverFacingHome(
      { cx: 34, cy: 20 },
      { cx: 34, cy: 90 },
    );
    // Forward bedeutet cy↓ → dy negativ.
    expect(f.dy).toBeLessThan(0);
    // Forward-Klammer bei -0.3 in Rohform; nach Normierung ≤ ca. -0.28.
    expect(f.dy).toBeLessThanOrEqual(-0.28);
  });

  it('Ball rechts vom Empfänger → dx positiv (zum Ball geneigt)', () => {
    const f = deriveReceiverFacingHome(
      { cx: 10, cy: 60 },
      { cx: 50, cy: 60 },
    );
    expect(f.dx).toBeGreaterThan(0);
    expect(f.dy).toBeLessThan(0);
  });

  it('Ball links vom Empfänger → dx negativ', () => {
    const f = deriveReceiverFacingHome(
      { cx: 50, cy: 60 },
      { cx: 10, cy: 60 },
    );
    expect(f.dx).toBeLessThan(0);
  });

  it('Empfänger direkt hinter dem Ball: volle Vorwärtsausrichtung', () => {
    const f = deriveReceiverFacingHome(
      { cx: 34, cy: 90 },
      { cx: 34, cy: 20 },
    );
    // Ball oben, Empfänger unten → toBall weist nach oben, mischt mit Forward.
    expect(f.dx).toBeCloseTo(0, 5);
    expect(f.dy).toBeLessThan(-0.9);
  });

  it('Ergebnis ist immer normiert und nie NaN', () => {
    const f = deriveReceiverFacingHome(
      { cx: 34, cy: 80 },
      { cx: 34, cy: 80 },
    );
    expect(Math.hypot(f.dx, f.dy)).toBeCloseTo(1, 6);
    expect(Number.isFinite(f.dx)).toBe(true);
    expect(Number.isFinite(f.dy)).toBe(true);
  });
});

describe('deriveReceiverCueHome', () => {
  it('offene Stellung mit Ball von hinten deutet auf Hinterfuß + Aufdrehen', () => {
    const cue = deriveReceiverCueHome(
      FACING_HOME,
      { cx: 34, cy: 85 },
      { cx: 34, cy: 45 },
    );
    expect(cue.bodyShape).toBe('open');
    expect(cue.arrivalSide).toBe('back_foot');
    expect(cue.continuation).toBe('turn');
  });

  it('seitlich geöffnete Stellung liefert halboffen + seitliches Mitnehmen', () => {
    const cue = deriveReceiverCueHome(
      normalizeFacing({ dx: 0.6, dy: -0.8 }),
      { cx: 60, cy: 61 },
      { cx: 28, cy: 48 },
    );
    expect(cue.bodyShape).toBe('half_open');
    expect(cue.continuation).toBe('carry_sideways');
  });

  it('geschlossene Stellung gegen die Ballrichtung deutet auf Vorderfuß + Klatschen', () => {
    const cue = deriveReceiverCueHome(
      normalizeFacing({ dx: 0.95, dy: -0.3 }),
      { cx: 55, cy: 48 },
      { cx: 34, cy: 48 },
    );
    expect(cue.bodyShape).toBe('closed');
    expect(cue.arrivalSide).toBe('front_foot');
    expect(cue.continuation).toBe('set');
  });

  it('Label-Maps decken alle didaktischen Kategorien ab', () => {
    expect(RECEIVER_BODY_SHAPE_LABELS.half_open).toBe('halboffen');
    expect(RECEIVER_ARRIVAL_SIDE_LABELS.back_foot).toBe('Hinterfuß');
    expect(RECEIVER_CONTINUATION_LABELS.carry_sideways).toBe(
      'seitlich mitnehmen',
    );
  });
});
