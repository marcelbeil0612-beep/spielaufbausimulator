import type { RoleCode } from '@/domain/types';
import type { Scene } from '@/domain/scene';
import { findPlayer } from '@/domain/scene';
import { getLines } from '@/domain/lines';
import { maxShiftDistance } from '@/domain/physics';
import type { ReactOptions } from '../reactTo';
import { PRESS_INTENSITY_FACTORS } from './pressIntensity';

/**
 * Rückzug überspielter Linien-Spieler pro Iteration (in Welt-Einheiten).
 * Wird mit `PRESS_INTENSITY_FACTORS.line` skaliert.
 */
export const LINE_RECOVERY_OFFSET = 4;

const MIDFIELD_ROLES: readonly RoleCode[] = [
  'CDM',
  'LCM',
  'RCM',
  'CAM',
  'LM',
  'RM',
];

/**
 * Regel 3: Wird die gegnerische Mittelfeldlinie überspielt (Ballträger liegt
 * in Angriffsrichtung hinter der Linie), schiebt sich diese Linie ein Stück
 * zurück Richtung eigenem Tor, um den Raum hinter sich zu schließen.
 */
export function compactLine(scene: Scene, options?: ReactOptions): Scene {
  const holder = findPlayer(scene, scene.ballHolderId);
  if (!holder) return scene;

  const attackerIsHome = scene.home.players.some((p) => p.id === holder.id);
  const opp = attackerIsHome ? scene.away : scene.home;
  const midY = getLines(opp).midfield;

  const overplayed = attackerIsHome
    ? holder.position.y > midY
    : holder.position.y < midY;
  if (!overplayed) return scene;

  const magnitude =
    LINE_RECOVERY_OFFSET * PRESS_INTENSITY_FACTORS[scene.pressIntensity].line;
  if (magnitude === 0) return scene;
  const direction = attackerIsHome ? +1 : -1;

  let changed = false;
  const updatedPlayers = opp.players.map((p) => {
    if (!MIDFIELD_ROLES.includes(p.role)) return p;
    const cap =
      options?.dt !== undefined
        ? Math.min(magnitude, maxShiftDistance(options.dt, p.role))
        : magnitude;
    if (cap <= 0) return p;
    changed = true;
    return {
      ...p,
      position: { x: p.position.x, y: p.position.y + direction * cap },
    };
  });

  if (!changed) return scene;

  return attackerIsHome
    ? { ...scene, away: { ...opp, players: updatedPlayers } }
    : { ...scene, home: { ...opp, players: updatedPlayers } };
}
