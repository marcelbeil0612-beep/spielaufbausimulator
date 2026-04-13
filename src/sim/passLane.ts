import type { Scene } from '@/domain/scene';
import type { PitchCoord } from '@/domain/types';
import { distanceToLineSegment } from '@/domain/geometry';
import { findPlayer } from '@/domain/scene';

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

/**
 * Convenience: Passlinie vom aktuellen Ballträger zum Zielspieler im Scene.
 * Liefert `undefined`, wenn Passgeber oder Ziel nicht existieren.
 */
export function assessPassLaneInScene(
  scene: Scene,
  targetId: string,
): PassLaneAssessment | undefined {
  const from = findPlayer(scene, scene.ballHolderId);
  const to = findPlayer(scene, targetId);
  if (!from || !to) return undefined;
  const attackerIsHome = scene.home.players.some((p) => p.id === from.id);
  const opp = attackerIsHome ? scene.away : scene.home;
  return assessPassLane(
    from.position,
    to.position,
    opp.players.map((p) => p.position),
  );
}
