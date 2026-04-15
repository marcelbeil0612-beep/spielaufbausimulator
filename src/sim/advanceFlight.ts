import type { Scene } from '@/domain/scene';
import type { BallFlight } from '@/domain/ballFlight';
import { reactTo } from './reactTo';

const REACTION_DURING_FLIGHT_FACTOR = 0.62;
const REACTION_DURING_RECEPTION_FACTOR = 0.35;

/**
 * Leitet die Szene zum Zeitpunkt `elapsed` innerhalb eines laufenden
 * Ballflugs ab. Basis ist immer die im `BallFlight` mitgeführte
 * Spieler-Baseline (t=0 des Flugs), damit beliebige Zeitpunkte
 * – auch Rückwärtsscrubbing – reproduzierbar sind.
 *
 * Bei `elapsed >= travelDuration` ist der Ball am Empfänger. Je nach
 * First-Touch-Qualität kann danach noch ein sehr kurzes Zusatzfenster
 * (`receptionWindowDuration`) laufen, in dem der Gegner weiter etwas
 * nachschieben darf. Die Reaktionszeit der Spieler wird dabei bewusst
 * gedämpft: Der Ball bleibt optisch klar die dominante Bewegung, während
 * die Teams eher nachschieben als den Flug „mitzulaufen". Erst bei
 * `elapsed >= duration` endet `ballFlight`.
 */
export function advanceFlight(scene: Scene, elapsed: number): Scene {
  const flight = scene.ballFlight;
  if (!flight) return scene;

  const clamped = clamp(elapsed, 0, flight.duration);
  const progress = flightProgressAt(flight, clamped);
  const ballPos = {
    x: flight.start.x + (flight.end.x - flight.start.x) * progress,
    y: flight.start.y + (flight.end.y - flight.start.y) * progress,
  };
  const baseScene: Scene = {
    ...scene,
    home: { ...scene.home, players: flight.baseline.homePlayers },
    away: { ...scene.away, players: flight.baseline.awayPlayers },
    ballPos,
  };
  const reacted = reactTo(baseScene, {
    dt: reactionTimeAt(flight, clamped),
  });

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
  if (flight.travelDuration <= 0) return 1;
  return elapsed / flight.travelDuration;
}

function reactionTimeAt(flight: BallFlight, elapsed: number): number {
  const duringFlight = Math.min(elapsed, flight.travelDuration);
  const duringReception = Math.max(0, elapsed - flight.travelDuration);
  return (
    duringFlight * REACTION_DURING_FLIGHT_FACTOR +
    duringReception * REACTION_DURING_RECEPTION_FACTOR
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
