import type { PitchCoord, Player } from './types';

/**
 * Baseline der Verteidiger-/Mitspieler-Positionen zum Zeitpunkt des
 * Pass-Starts. Wird mitgeführt, damit beliebige Zeitpunkte des Flugs
 * (Scrubbing) reproduzierbar abgeleitet werden können.
 */
export type BallFlightBaseline = {
  readonly homePlayers: readonly Player[];
  readonly awayPlayers: readonly Player[];
};

/**
 * Beschreibung eines laufenden Passes.
 *
 * Während `ballFlight` gesetzt ist, befindet sich der Ball zwischen
 * zwei Spielern und kann zeitlich gescrubbt werden:
 *  - `elapsed / duration` ist der Fortschritt in [0, 1],
 *  - `start` und `end` sind die Start- und Endpositionen des Balls,
 *  - `fromId` / `toId` identifizieren Sender und vorgesehenen Empfänger,
 *  - `baseline` hält die Spielerpositionen unmittelbar vor dem Pass fest.
 */
export type BallFlight = {
  readonly fromId: string;
  readonly toId: string;
  readonly start: PitchCoord;
  readonly end: PitchCoord;
  readonly duration: number;
  readonly elapsed: number;
  readonly baseline: BallFlightBaseline;
};

/** Linear interpolierte Ballposition entlang des Flugs. */
export function ballPositionFromFlight(flight: BallFlight): PitchCoord {
  const t = flightProgress(flight);
  return {
    x: flight.start.x + (flight.end.x - flight.start.x) * t,
    y: flight.start.y + (flight.end.y - flight.start.y) * t,
  };
}

/** Fortschritt des Flugs als Wert in [0, 1]. */
export function flightProgress(flight: BallFlight): number {
  if (flight.duration <= 0) return 1;
  const t = flight.elapsed / flight.duration;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function isFlightComplete(flight: BallFlight): boolean {
  return flight.elapsed >= flight.duration;
}
