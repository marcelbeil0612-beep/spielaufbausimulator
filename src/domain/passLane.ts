import type { PitchCoord } from './types';
import { distanceToLineSegment } from './geometry';

/**
 * Radius um die Passlinie, innerhalb dessen ein Gegner den Pass akut
 * abfangen kann (Fußabstand, Grätsch-/Stellungsreichweite).
 */
export const LANE_BLOCK_RADIUS = 3;

/**
 * Weiterer Radius: ein Gegner in diesem Band kann den Pass zwar nicht
 * sicher abfangen, engt die Passlinie aber ein und erhöht das Risiko.
 */
export const LANE_THREAT_RADIUS = 6;

export type PassLaneAssessment = {
  /** Kürzester Abstand eines Gegners zur Passlinie. `Infinity` wenn keine Gegner. */
  readonly closest: number;
  /** Anzahl Gegner innerhalb `LANE_BLOCK_RADIUS` (können den Pass abfangen). */
  readonly blockers: number;
  /** Anzahl Gegner im weiteren Druckband (`LANE_THREAT_RADIUS`, exkl. blockers). */
  readonly threats: number;
};

/**
 * Bewertet die Passlinie zwischen zwei Punkten aus Sicht der
 * gegnerischen Feldspieler. Rein geometrisch; keine Annahmen über
 * Spieltempo oder -richtung.
 */
export function assessPassLane(
  from: PitchCoord,
  to: PitchCoord,
  opponents: readonly PitchCoord[],
): PassLaneAssessment {
  let closest = Infinity;
  let blockers = 0;
  let threats = 0;
  for (const opp of opponents) {
    const d = distanceToLineSegment(opp, from, to);
    if (d < closest) closest = d;
    if (d <= LANE_BLOCK_RADIUS) blockers += 1;
    else if (d <= LANE_THREAT_RADIUS) threats += 1;
  }
  return { closest, blockers, threats };
}
