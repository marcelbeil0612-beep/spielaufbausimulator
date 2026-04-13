import type { RoleCode } from '@/domain/types';
import type { Scene } from '@/domain/scene';
import { findPlayer } from '@/domain/scene';
import { getLines } from '@/domain/lines';

/**
 * Rückzug überspielter Linien-Spieler pro Iteration (in Welt-Einheiten).
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
export function compactLine(scene: Scene): Scene {
  const holder = findPlayer(scene, scene.ballHolderId);
  if (!holder) return scene;

  const attackerIsHome = scene.home.players.some((p) => p.id === holder.id);
  const opp = attackerIsHome ? scene.away : scene.home;
  const midY = getLines(opp).midfield;

  const overplayed = attackerIsHome
    ? holder.position.y > midY
    : holder.position.y < midY;
  if (!overplayed) return scene;

  const shift = attackerIsHome ? +LINE_RECOVERY_OFFSET : -LINE_RECOVERY_OFFSET;
  const updatedPlayers = opp.players.map((p) =>
    MIDFIELD_ROLES.includes(p.role)
      ? { ...p, position: { x: p.position.x, y: p.position.y + shift } }
      : p,
  );

  return attackerIsHome
    ? { ...scene, away: { ...opp, players: updatedPlayers } }
    : { ...scene, home: { ...opp, players: updatedPlayers } };
}
