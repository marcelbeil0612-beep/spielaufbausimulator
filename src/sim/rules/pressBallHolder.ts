import type { Player, RoleCode } from '@/domain/types';
import type { Scene } from '@/domain/scene';
import { findPlayer } from '@/domain/scene';
import { distance, pressPosition } from '@/domain/geometry';
import { maxShiftDistance } from '@/domain/physics';
import type { ReactOptions } from '../reactTo';
import { PRESS_INTENSITY_FACTORS } from './pressIntensity';
import { formationContextFor } from './formationContext';

/**
 * Zielabstand des pressenden Stürmers zum neuen Ballträger (in Welt-Einheiten).
 * Bei geringerer Presshöhe vergrößert sich der Zielabstand
 * (siehe `PRESS_INTENSITY_FACTORS.press`).
 */
export const PRESS_DISTANCE = 8;

/**
 * Regel 1: Der ballnächste gegnerische Stürmer schiebt auf den Ballträger
 * und bleibt `PRESS_DISTANCE` Einheiten vor ihm stehen.
 */
export function pressBallHolder(scene: Scene, options?: ReactOptions): Scene {
  const holder = findPlayer(scene, scene.ballHolderId);
  if (!holder) return scene;

  const attackerIsHome = scene.home.players.some((p) => p.id === holder.id);
  const opp = attackerIsHome ? scene.away : scene.home;

  const context = formationContextFor(opp.formation);
  const nearest = nearestOfRoles(opp.players, holder, context.pressRoles);
  if (!nearest) return scene;

  const factor = PRESS_INTENSITY_FACTORS[scene.pressIntensity].press;
  const targetDistance = PRESS_DISTANCE * factor;
  const target = pressPosition(
    nearest.position,
    holder.position,
    targetDistance,
  );
  const newPos = capMoveTo(nearest, target, options);
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

/**
 * Wie stark der Pressing-Picker einen Anstellwinkel von der Innenseite
 * bevorzugt: pro Welt-Einheit, die ein Kandidat zentraler steht als der
 * Ballträger, wird die effektive Distanz um diesen Faktor reduziert.
 * Real soll der ballnahe Stürmer den Pass nach innen verbieten und nicht
 * von der Außenlinie pressen.
 */
const INSIDE_ANGLE_BIAS = 0.4;

function nearestOfRoles(
  players: readonly Player[],
  target: Player,
  roles: readonly RoleCode[],
): Player | undefined {
  const centerSign = Math.sign(50 - target.position.x);
  let best: Player | undefined;
  let bestScore = Infinity;
  for (const p of players) {
    if (!roles.includes(p.role)) continue;
    const d = distance(p.position, target.position);
    const insideAdvantage =
      centerSign === 0
        ? 0
        : Math.max(0, (p.position.x - target.position.x) * centerSign);
    const score = d - insideAdvantage * INSIDE_ANGLE_BIAS;
    if (score < bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}

function capMoveTo(
  player: Player,
  target: { x: number; y: number },
  options: ReactOptions | undefined,
): { x: number; y: number } {
  if (options?.dt === undefined) return target;
  const dx = target.x - player.position.x;
  const dy = target.y - player.position.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return player.position;
  const max = maxShiftDistance(options.dt, player.role);
  if (max >= dist) return target;
  if (max <= 0) return player.position;
  const k = max / dist;
  return {
    x: player.position.x + dx * k,
    y: player.position.y + dy * k,
  };
}
