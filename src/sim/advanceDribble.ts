import type { Scene } from '@/domain/scene';
import type { Dribble } from '@/domain/dribble';
import { reactTo } from './reactTo';

/**
 * Leitet die Szene zum Zeitpunkt `elapsed` innerhalb eines laufenden
 * Dribblings ab. Analog zu `advanceFlight`: Basis sind die im `Dribble`
 * mitgeführten Baseline-Positionen (t=0 des Dribblings).
 *
 * Während des Dribblings läuft der ballführende Spieler linear von
 * `start` nach `end`. Der Ball hängt an ihm (`ballPos = Spielerposition`).
 * Verteidiger reagieren mit `reactTo({ dt: clamped })` auf die aktuelle
 * Spielerposition – ihre Verschiebungen bleiben durch ihre Laufgeschwindigkeit
 * gekappt. Bei `elapsed >= duration` wird das Dribbling beendet.
 */
export function advanceDribble(scene: Scene, elapsed: number): Scene {
  const dribble = scene.dribble;
  if (!dribble) return scene;

  const clamped = clamp(elapsed, 0, dribble.duration);
  const progress = dribble.duration > 0 ? clamped / dribble.duration : 1;
  const holderPos = {
    x: dribble.start.x + (dribble.end.x - dribble.start.x) * progress,
    y: dribble.start.y + (dribble.end.y - dribble.start.y) * progress,
  };
  const movedHome = dribble.baseline.homePlayers.map((p) =>
    p.id === dribble.playerId ? { ...p, position: holderPos } : p,
  );
  const baseScene: Scene = {
    ...scene,
    home: { ...scene.home, players: movedHome },
    away: { ...scene.away, players: dribble.baseline.awayPlayers },
  };
  const reacted = reactTo(baseScene, { dt: clamped });

  const complete = clamped >= dribble.duration;
  const nextDribble: Dribble | null = complete
    ? null
    : { ...dribble, elapsed: clamped };

  return {
    ...reacted,
    dribble: nextDribble,
    ballPos: holderPos,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
