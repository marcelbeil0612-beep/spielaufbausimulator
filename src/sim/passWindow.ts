import type { Scene } from '@/domain/scene';
import { findPlayer } from '@/domain/scene';
import type { PitchCoord } from '@/domain/types';
import {
  assessPassLane,
  assessPassLaneInScene,
  LANE_BLOCK_RADIUS,
  LANE_THREAT_RADIUS,
} from './passLane';
import type { PassLaneAssessment } from './passLane';

export type PassWindow = 'open' | 'tight' | 'blocked';

export const PASS_WINDOW_LABELS: Record<PassWindow, string> = {
  open: 'Linie offen',
  tight: 'Passweg eng',
  blocked: 'Passweg verdeckt',
};

/**
 * Kleine didaktische Einordnung einer Passlinie.
 *  - `blocked`: mindestens ein Gegner direkt im Block-Radius
 *  - `tight`  : kein Blocker, aber Gegner im Threat-Band / sehr nahe an der Linie
 *  - `open`   : keine relevante unmittelbare Störung
 */
export function classifyPassWindow(assessment: PassLaneAssessment): PassWindow {
  if (assessment.blockers >= 1) return 'blocked';
  if (
    assessment.threats >= 1 ||
    assessment.closest <= LANE_BLOCK_RADIUS + (LANE_THREAT_RADIUS - LANE_BLOCK_RADIUS) * 0.45
  ) {
    return 'tight';
  }
  return 'open';
}

export function assessPassWindow(
  from: PitchCoord,
  to: PitchCoord,
  opponents: readonly PitchCoord[],
): PassWindow {
  return classifyPassWindow(assessPassLane(from, to, opponents));
}

export function assessPassWindowInScene(
  scene: Scene,
  targetId: string,
): PassWindow | undefined {
  const lane = assessPassLaneInScene(scene, targetId);
  return lane ? classifyPassWindow(lane) : undefined;
}

export function assessMoveWindowInScene(
  scene: Scene,
  to: PitchCoord,
): PassWindow | undefined {
  const holder = findPlayer(scene, scene.ballHolderId);
  if (!holder) return undefined;
  const attackerIsHome = scene.home.players.some((p) => p.id === holder.id);
  const opp = attackerIsHome ? scene.away : scene.home;
  return assessPassWindow(
    holder.position,
    to,
    opp.players.map((p) => p.position),
  );
}
