import type { Scene } from '@/domain/scene';
import { findPlayer } from '@/domain/scene';
import {
  assessPassLane,
  LANE_BLOCK_RADIUS,
  LANE_THREAT_RADIUS,
} from '@/domain/passLane';
import type { PassLaneAssessment } from '@/domain/passLane';

export {
  assessPassLane,
  LANE_BLOCK_RADIUS,
  LANE_THREAT_RADIUS,
};
export type { PassLaneAssessment };

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
