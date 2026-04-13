import type { Player } from '@/domain/types';
import type { Scene } from '@/domain/scene';
import { findPlayer } from '@/domain/scene';
import { distance, pressPosition } from '@/domain/geometry';

/**
 * Zielabstand des pressenden Stürmers zum neuen Ballträger (in Welt-Einheiten).
 */
export const PRESS_DISTANCE = 8;

/**
 * Regel 1: Der ballnächste gegnerische Stürmer schiebt auf den Ballträger
 * und bleibt `PRESS_DISTANCE` Einheiten vor ihm stehen.
 */
export function pressBallHolder(scene: Scene): Scene {
  const holder = findPlayer(scene, scene.ballHolderId);
  if (!holder) return scene;

  const attackerIsHome = scene.home.players.some((p) => p.id === holder.id);
  const opp = attackerIsHome ? scene.away : scene.home;

  const nearest = nearestStriker(opp.players, holder);
  if (!nearest) return scene;

  const newPos = pressPosition(nearest.position, holder.position, PRESS_DISTANCE);
  if (newPos.x === nearest.position.x && newPos.y === nearest.position.y) {
    return scene;
  }

  const updatedPlayers = opp.players.map((p) =>
    p.id === nearest.id ? { ...p, position: newPos } : p,
  );

  return attackerIsHome
    ? { ...scene, away: { ...opp, players: updatedPlayers } }
    : { ...scene, home: { ...opp, players: updatedPlayers } };
}

function nearestStriker(
  players: readonly Player[],
  target: Player,
): Player | undefined {
  let best: Player | undefined;
  let bestDist = Infinity;
  for (const p of players) {
    if (p.role !== 'ST') continue;
    const d = distance(p.position, target.position);
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}
