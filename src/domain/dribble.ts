import type { PitchCoord, Player } from './types';
import { distance } from './geometry';

/**
 * Dribbling-Geschwindigkeiten (m/s). `walk` ≈ Abschirm-Tempo beim Ablegen,
 * `jog` ≈ progressive Ballmitnahme, `sprint` ≈ Konter-Tempo mit Ball.
 */
export type DribbleSpeed = 'walk' | 'jog' | 'sprint';

export const DEFAULT_DRIBBLE_SPEED: DribbleSpeed = 'jog';

export const DRIBBLE_SPEED_MPS: Record<DribbleSpeed, number> = {
  walk: 3,
  jog: 5,
  sprint: 7,
};

/**
 * Positionen von Heim- und Auswärtsspielern zum Zeitpunkt des Dribbling-
 * Starts. Mitgeführt, damit beliebige Zeitpunkte reproduzierbar ableitbar
 * sind (analog zu `BallFlightBaseline`).
 */
export type DribbleBaseline = {
  readonly homePlayers: readonly Player[];
  readonly awayPlayers: readonly Player[];
};

/**
 * Beschreibung eines laufenden Dribblings. Im Gegensatz zum Pass bleibt
 * der Ball beim Dribbler; `start`/`end` beschreiben die Laufstrecke des
 * Ballführenden. Während `dribble` gesetzt ist, gilt `ballFlight === null`
 * und umgekehrt – beide Bewegungen sind exklusiv.
 */
export type Dribble = {
  readonly playerId: string;
  readonly start: PitchCoord;
  readonly end: PitchCoord;
  readonly speed: DribbleSpeed;
  readonly duration: number;
  readonly elapsed: number;
  readonly baseline: DribbleBaseline;
};

export function dribbleDuration(
  from: PitchCoord,
  to: PitchCoord,
  speed: DribbleSpeed,
): number {
  const d = distance(from, to);
  return d / DRIBBLE_SPEED_MPS[speed];
}

export function dribbleProgress(dribble: Dribble): number {
  if (dribble.duration <= 0) return 1;
  const t = dribble.elapsed / dribble.duration;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function dribblePlayerPosition(dribble: Dribble): PitchCoord {
  const t = dribbleProgress(dribble);
  return {
    x: dribble.start.x + (dribble.end.x - dribble.start.x) * t,
    y: dribble.start.y + (dribble.end.y - dribble.start.y) * t,
  };
}

export function isDribbleComplete(dribble: Dribble): boolean {
  return dribble.elapsed >= dribble.duration;
}
