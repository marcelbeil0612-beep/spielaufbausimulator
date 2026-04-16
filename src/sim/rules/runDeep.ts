import type { Scene } from '@/domain/scene';
import { findPlayer } from '@/domain/scene';
import { maxShiftDistance } from '@/domain/physics';
import type { PitchCoord, Player } from '@/domain/types';
import type { ReactOptions } from '../reactTo';
import { suggestMoves } from '../suggestMoves';

/**
 * Tiefenlauf-Regel: Wenn `suggestMoves` einen `between_lines`-Kandidaten
 * nennt, läuft genau dieser Spieler während des Ballflugs ein Stück in
 * den Raum Richtung `suggestion.to`. Die Distanz ist bereits durch
 * `suggestMoves`' `MAX_STEP=10` nach oben begrenzt; zusätzlich skaliert
 * der Fortschritt des Flugs den Lauf, damit er sichtbar zum Pass gehört
 * und nicht schlagartig passiert.
 *
 * Bewusst nur für das Heim-Team: `suggestMoves` liefert keine Vorschläge
 * für Auswärts-Angreifer. Der Ballträger und der Sender werden
 * ausgeschlossen – der Empfänger macht seinen Lauf in `supportOwnPlay`,
 * der Sender das "Pass-und-Geh".
 */
export function runDeep(scene: Scene, options?: ReactOptions): Scene {
  if (!scene.ballFlight) return scene;
  const holder = findPlayer(scene, scene.ballHolderId);
  if (!holder) return scene;

  const attackerIsHome = scene.home.players.some((p) => p.id === holder.id);
  if (!attackerIsHome) return scene;

  const suggestion = suggestMoves(scene).find((m) => m.code === 'between_lines');
  if (!suggestion) return scene;
  if (suggestion.playerId === scene.ballHolderId) return scene;
  if (suggestion.playerId === scene.ballFlight.fromId) return scene;

  const player = scene.home.players.find((p) => p.id === suggestion.playerId);
  if (!player) return scene;

  const flight = scene.ballFlight;
  const progress =
    flight.travelDuration > 0
      ? clamp(flight.elapsed / flight.travelDuration, 0, 1)
      : 1;

  const target = progressToward(player.position, suggestion.to, progress);
  const next = capMoveTo(player, target, options);
  if (next.x === player.position.x && next.y === player.position.y) {
    return scene;
  }

  const updatedPlayers = scene.home.players.map((p) =>
    p.id === player.id ? { ...p, position: next } : p,
  );
  return { ...scene, home: { ...scene.home, players: updatedPlayers } };
}

function progressToward(
  from: PitchCoord,
  to: PitchCoord,
  progress: number,
): PitchCoord {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return from;
  const k = progress;
  return {
    x: clamp(from.x + dx * k, 0, 100),
    y: clamp(from.y + dy * k, 0, 100),
  };
}

function capMoveTo(
  player: Player,
  target: PitchCoord,
  options: ReactOptions | undefined,
): PitchCoord {
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

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
