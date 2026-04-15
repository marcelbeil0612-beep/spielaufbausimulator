import type { Player } from '@/domain/types';
import type { Scene } from '@/domain/scene';
import { findPlayer } from '@/domain/scene';
import { distance } from '@/domain/geometry';
import { maxShiftDistance } from '@/domain/physics';
import type { ReactOptions } from '../reactTo';
import { PRESS_INTENSITY_FACTORS } from './pressIntensity';
import { formationContextFor } from './formationContext';

/**
 * Schrittweite, mit der der absichernde Spieler zur Spielfeldmitte zieht.
 * Wird mit `PRESS_INTENSITY_FACTORS.cover` skaliert.
 */
export const COVER_CENTER_SHIFT = 4;

/**
 * Anteil, mit dem der Cover-Zielpunkt aus der reinen Mitte (x=50) Richtung
 * Ballseite verschoben wird. 0 = starr Mitte, 1 = direkt auf Ball-x.
 * Real positioniert sich der zweite Mann zwischen Mitte und ballnahem
 * Halbraum – ein moderater Bias bildet das ab.
 */
export const COVER_BALL_SIDE_BIAS = 0.35;

/**
 * Regel 2: Der nicht-pressende Absicherer zieht in Richtung Spielfeldmitte,
 * um die zentrale Passlinie zu verstellen. Welche Rolle diese Aufgabe
 * übernimmt, hängt von der Gegner-Formation ab (siehe `formationContext`).
 * Steht kein zweiter Kandidat zur Verfügung, ist die Regel ein No-op.
 */
export function coverCenter(scene: Scene, options?: ReactOptions): Scene {
  const holder = findPlayer(scene, scene.ballHolderId);
  if (!holder) return scene;

  const attackerIsHome = scene.home.players.some((p) => p.id === holder.id);
  const opp = attackerIsHome ? scene.away : scene.home;
  const context = formationContextFor(opp.formation);

  const pressers = opp.players.filter((p) =>
    context.pressRoles.includes(p.role),
  );
  if (pressers.length === 0) return scene;
  const pressing = nearestTo(pressers, holder);

  const candidates = opp.players.filter(
    (p) =>
      context.coverRoles.includes(p.role) &&
      (pressing ? p.id !== pressing.id : true),
  );
  if (candidates.length === 0) return scene;

  const maxShift =
    COVER_CENTER_SHIFT * PRESS_INTENSITY_FACTORS[scene.pressIntensity].cover;
  if (maxShift === 0) return scene;

  const centerTargetX = 50 + (scene.ballPos.x - 50) * COVER_BALL_SIDE_BIAS;
  const ids = new Set(candidates.map((p) => p.id));
  let changed = false;
  const updatedPlayers = opp.players.map((p) => {
    if (!ids.has(p.id)) return p;
    const dx = centerTargetX - p.position.x;
    if (dx === 0) return p;
    const cap =
      options?.dt !== undefined
        ? Math.min(maxShift, maxShiftDistance(options.dt, p.role))
        : maxShift;
    if (cap <= 0) return p;
    const step = Math.sign(dx) * Math.min(Math.abs(dx), cap);
    if (step === 0) return p;
    changed = true;
    return { ...p, position: { x: p.position.x + step, y: p.position.y } };
  });

  if (!changed) return scene;

  return attackerIsHome
    ? { ...scene, away: { ...opp, players: updatedPlayers } }
    : { ...scene, home: { ...opp, players: updatedPlayers } };
}

function nearestTo(players: readonly Player[], target: Player): Player | undefined {
  let best: Player | undefined;
  let bestDist = Infinity;
  for (const p of players) {
    const d = distance(p.position, target.position);
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}
