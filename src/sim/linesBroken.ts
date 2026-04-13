import type { TeamLines } from '@/domain/lines';
import type { TeamSide } from '@/domain/types';

export type LineCount = 0 | 1 | 2 | 3;

/**
 * Zählt, wie viele gegnerische Linien (Abwehr/Mittelfeld/Angriff) durch
 * einen Pass von `fromY` nach `toY` überspielt werden.
 *
 * Für das Heimteam ist die Angriffsrichtung +y, für das Auswärtsteam −y.
 * Ein Rückpass (gleiche oder rückwärtige Y-Richtung) überspielt keine Linie.
 */
export function linesBroken(
  fromY: number,
  toY: number,
  opponentLines: TeamLines,
  attackingSide: TeamSide,
): LineCount {
  const ys: readonly number[] = [
    opponentLines.defense,
    opponentLines.midfield,
    opponentLines.attack,
  ];

  let count = 0;
  if (attackingSide === 'home') {
    if (toY <= fromY) return 0;
    for (const line of ys) {
      if (fromY < line && line <= toY) count += 1;
    }
  } else {
    if (toY >= fromY) return 0;
    for (const line of ys) {
      if (fromY > line && line >= toY) count += 1;
    }
  }
  return count as LineCount;
}
