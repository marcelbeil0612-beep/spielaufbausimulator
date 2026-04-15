import type { Player, RoleCode } from '@/domain/types';
import type { Scene } from '@/domain/scene';
import { findPlayer } from '@/domain/scene';
import { distance, pressPosition } from '@/domain/geometry';
import { maxShiftDistance } from '@/domain/physics';
import { assessPassLane } from '@/domain/passLane';
import type { ReactOptions } from '../reactTo';
import { PRESS_DISTANCE } from './pressBallHolder';
import { PRESS_INTENSITY_FACTORS } from './pressIntensity';
import { formationContextFor } from './formationContext';

/**
 * Anteil der `PRESS_DISTANCE`, mit dem der zweite Mann den nächst-anspiel-
 * baren Mitspieler des Ballträgers attackiert. Bewusst weicher (1/2) als
 * der Hauptpresser, damit „Zugriff vs. Absicherung" sichtbar bleibt.
 */
export const SECOND_MAN_PRESS_FACTOR = 0.5;

/**
 * Maximale Distanz, in der ein Mitspieler des Ballträgers überhaupt als
 * akute Anschlussoption gilt. Spieler weiter weg sind keine echte
 * Anspielstation, der zweite Mann reagiert nicht auf sie.
 */
const SUPPORT_RANGE = 30;

const SECOND_MAN_ROLES: readonly RoleCode[] = [
  'CDM',
  'LCM',
  'RCM',
  'CAM',
  'LM',
  'RM',
];

/**
 * Regel: Ein zweiter Gegenspieler (typischerweise Sechser/Achter) rückt
 * auf den nächsten freien Anschlussempfänger des Ballträgers heraus –
 * mit halber Druckdistanz, damit Zugriff und Absicherung nebeneinander
 * sichtbar bleiben.
 *
 * Schritt für Schritt:
 *  1. Hauptpresser bestimmen (zur Vermeidung von Doppelbelegung).
 *  2. Ballnächsten Mitspieler des Ballträgers mit freier Passlinie
 *     suchen (`assessPassLane.blockers === 0`, in `SUPPORT_RANGE`).
 *  3. Aus den Mittelfeld-Rollen des Gegners den nächstgelegenen
 *     auswählen (Hauptpresser ausgenommen).
 *  4. Diesen Spieler bis auf `PRESS_DISTANCE * SECOND_MAN_PRESS_FACTOR`
 *     an die Anspielstation heranziehen, gekappt durch `maxShiftDistance`.
 */
export function pressSecondMan(scene: Scene, options?: ReactOptions): Scene {
  const holder = findPlayer(scene, scene.ballHolderId);
  if (!holder) return scene;

  const attackerIsHome = scene.home.players.some((p) => p.id === holder.id);
  const ownTeam = attackerIsHome ? scene.home : scene.away;
  const opp = attackerIsHome ? scene.away : scene.home;

  const context = formationContextFor(opp.formation);
  const chiefPresser = nearestPresser(opp.players, holder, context.pressRoles);

  const threat = findThreateningMate(holder, ownTeam.players, opp.players);
  if (!threat) return scene;

  const candidate = nearestSecondMan(opp.players, threat, chiefPresser);
  if (!candidate) return scene;

  const factor = PRESS_INTENSITY_FACTORS[scene.pressIntensity].press;
  const targetDistance = PRESS_DISTANCE * SECOND_MAN_PRESS_FACTOR * factor;
  const desired = pressPosition(candidate.position, threat.position, targetDistance);
  const next = capMoveTo(candidate, desired, options);
  if (next.x === candidate.position.x && next.y === candidate.position.y) {
    return scene;
  }

  const updatedPlayers = opp.players.map((p) =>
    p.id === candidate.id ? { ...p, position: next } : p,
  );

  return attackerIsHome
    ? { ...scene, away: { ...opp, players: updatedPlayers } }
    : { ...scene, home: { ...opp, players: updatedPlayers } };
}

function nearestPresser(
  players: readonly Player[],
  holder: Player,
  roles: readonly RoleCode[],
): Player | undefined {
  let best: Player | undefined;
  let bestDist = Infinity;
  for (const p of players) {
    if (!roles.includes(p.role)) continue;
    const d = distance(p.position, holder.position);
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}

function findThreateningMate(
  holder: Player,
  mates: readonly Player[],
  opponents: readonly Player[],
): Player | undefined {
  const oppCoords = opponents.map((p) => p.position);
  let best: Player | undefined;
  let bestDist = Infinity;
  for (const mate of mates) {
    if (mate.id === holder.id) continue;
    if (mate.role === 'GK') continue;
    const d = distance(mate.position, holder.position);
    if (d > SUPPORT_RANGE) continue;
    const lane = assessPassLane(holder.position, mate.position, oppCoords);
    if (lane.blockers >= 1) continue;
    if (d < bestDist) {
      best = mate;
      bestDist = d;
    }
  }
  return best;
}

function nearestSecondMan(
  players: readonly Player[],
  target: Player,
  exclude: Player | undefined,
): Player | undefined {
  let best: Player | undefined;
  let bestDist = Infinity;
  for (const p of players) {
    if (!SECOND_MAN_ROLES.includes(p.role)) continue;
    if (exclude && p.id === exclude.id) continue;
    const d = distance(p.position, target.position);
    if (d < bestDist) {
      best = p;
      bestDist = d;
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
