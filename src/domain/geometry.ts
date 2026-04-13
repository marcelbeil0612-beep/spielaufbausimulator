import type { PitchCoord } from './types';

export function distance(a: PitchCoord, b: PitchCoord): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Verschiebt `pressor` auf einer geraden Linie Richtung `target`,
 * sodass er am Ende `stopShort` Einheiten vom Ziel entfernt steht.
 * Steht er bereits näher, bleibt er stehen.
 */
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
