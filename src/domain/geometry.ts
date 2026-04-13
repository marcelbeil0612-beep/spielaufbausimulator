import type { PitchCoord } from './types';

export function distance(a: PitchCoord, b: PitchCoord): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Verschiebt `pressor` auf einer geraden Linie Richtung `target`,
 * sodass er am Ende `stopShort` Einheiten vom Ziel entfernt steht.
 * Steht er bereits näher, bleibt er stehen.
 */
/**
 * Kürzester Abstand vom Punkt `p` zum Liniensegment `a`–`b`.
 * Fällt das Lot außerhalb der Strecke, wird zum näheren Endpunkt gemessen.
 * Für `a === b` fällt die Funktion auf die euklidische Distanz zurück.
 */
export function distanceToLineSegment(
  p: PitchCoord,
  a: PitchCoord,
  b: PitchCoord,
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const foot = { x: a.x + clamped * dx, y: a.y + clamped * dy };
  return distance(p, foot);
}

export function pressPosition(
  pressor: PitchCoord,
  target: PitchCoord,
  stopShort: number,
): PitchCoord {
  const dx = pressor.x - target.x;
  const dy = pressor.y - target.y;
  const d = Math.hypot(dx, dy);
  if (d <= stopShort) return pressor;
  return {
    x: target.x + (dx / d) * stopShort,
    y: target.y + (dy / d) * stopShort,
  };
}
