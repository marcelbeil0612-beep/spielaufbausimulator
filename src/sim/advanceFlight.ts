import type { Scene } from '@/domain/scene';
import type { BallFlight } from '@/domain/ballFlight';
import { reactTo } from './reactTo';

/**
 * Leitet die Szene zum Zeitpunkt `elapsed` innerhalb eines laufenden
 * Ballflugs ab. Basis ist immer die im `BallFlight` mitgeführte
 * Spieler-Baseline (t=0 des Flugs), damit beliebige Zeitpunkte
 * – auch Rückwärtsscrubbing – reproduzierbar sind.
 *
 * Bei `elapsed >= duration` wird der Flug beendet: `ballFlight` wird
 * auf null gesetzt, `ballPos` auf den Zielpunkt. Die Verteidiger haben
 * dann die volle, durch ihre Laufgeschwindigkeit gekappte Reaktion
 * vollzogen.
 */
export function advanceFlight(scene: Scene, elapsed: number): Scene {
  const flight = scene.ballFlight;
  if (!flight) return scene;

  const clamped = clamp(elapsed, 0, flight.duration);
  const baseScene: Scene = {
    ...scene,
    home: { ...scene.home, players: flight.baseline.homePlayers },
    away: { ...scene.away, players: flight.baseline.awayPlayers },
  };
  const reacted = reactTo(baseScene, { dt: clamped });
  const progress = flightProgressAt(flight, clamped);
  const ballPos = {
    x: flight.start.x + (flight.end.x - flight.start.x) * progress,
    y: flight.start.y + (flight.end.y - flight.start.y) * progress,
  };

  const complete = clamped >= flight.duration;
  const nextFlight: BallFlight | null = complete
    ? null
    : { ...flight, elapsed: clamped };

  return {
    ...reacted,
    ballFlight: nextFlight,
    ballPos: complete ? flight.end : ballPos,
  };
}

function flightProgressAt(flight: BallFlight, elapsed: number): number {
  if (flight.duration <= 0) return 1;
  return elapsed / flight.duration;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
