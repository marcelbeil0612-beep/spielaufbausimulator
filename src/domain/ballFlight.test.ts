import { describe, expect, it } from 'vitest';
import {
  anticipatedBallPos,
  ballPositionFromFlight,
  flightProgress,
  isFlightComplete,
  REACTION_LAG,
  type BallFlight,
} from './ballFlight';

const FLIGHT: BallFlight = {
  fromId: 'a',
  toId: 'b',
  start: { x: 0, y: 0 },
  end: { x: 10, y: 20 },
  travelDuration: 1,
  receptionWindowDuration: 0.25,
  duration: 1.25,
  elapsed: 0.5,
  baseline: { homePlayers: [], awayPlayers: [] },
};

describe('flightProgress', () => {
  it('0 bei elapsed=0', () => {
    expect(flightProgress({ ...FLIGHT, elapsed: 0 })).toBe(0);
  });
  it('1 bei elapsed>=duration', () => {
    expect(flightProgress({ ...FLIGHT, elapsed: 2 })).toBe(1);
  });
  it('linear in der Mitte', () => {
    expect(flightProgress(FLIGHT)).toBeCloseTo(0.5, 6);
  });
  it('Null-Dauer → 1', () => {
    expect(flightProgress({ ...FLIGHT, travelDuration: 0, elapsed: 0 })).toBe(1);
  });
});

describe('ballPositionFromFlight', () => {
  it('Start bei elapsed=0', () => {
    const p = ballPositionFromFlight({ ...FLIGHT, elapsed: 0 });
    expect(p).toEqual({ x: 0, y: 0 });
  });
  it('Ende bei elapsed>=duration', () => {
    const p = ballPositionFromFlight({ ...FLIGHT, elapsed: 5 });
    expect(p).toEqual({ x: 10, y: 20 });
  });
  it('bleibt auch im Nachschiebe-Fenster am Zielpunkt', () => {
    const p = ballPositionFromFlight({ ...FLIGHT, elapsed: 1.1 });
    expect(p).toEqual({ x: 10, y: 20 });
  });
  it('lineare Mittelung bei halber Flugzeit', () => {
    const p = ballPositionFromFlight(FLIGHT);
    expect(p.x).toBeCloseTo(5, 6);
    expect(p.y).toBeCloseTo(10, 6);
  });
});

describe('isFlightComplete', () => {
  it('false während des Flugs', () => {
    expect(isFlightComplete(FLIGHT)).toBe(false);
  });
  it('true am Ende', () => {
    expect(isFlightComplete({ ...FLIGHT, elapsed: FLIGHT.duration })).toBe(true);
  });
});

describe('anticipatedBallPos', () => {
  it('ohne Flug: Fallback wird zurückgegeben', () => {
    const fallback = { x: 12, y: 34 };
    expect(anticipatedBallPos(null, fallback)).toEqual(fallback);
  });

  it('läuft dem Ball um REACTION_LAG voraus', () => {
    const predicted = anticipatedBallPos(FLIGHT, { x: 0, y: 0 });
    const now = ballPositionFromFlight(FLIGHT);
    // Erwartung: predicted liegt zwischen `now` und `flight.end`.
    expect(predicted.x).toBeGreaterThan(now.x);
    expect(predicted.y).toBeGreaterThan(now.y);
    expect(predicted.x).toBeLessThanOrEqual(FLIGHT.end.x + 0.0001);
    expect(predicted.y).toBeLessThanOrEqual(FLIGHT.end.y + 0.0001);
    // Vorhersage entspricht exakt `elapsed + REACTION_LAG` am Flugpfad.
    const expectedK =
      Math.min(FLIGHT.elapsed + REACTION_LAG, FLIGHT.travelDuration) /
      FLIGHT.travelDuration;
    expect(predicted.x).toBeCloseTo(
      FLIGHT.start.x + (FLIGHT.end.x - FLIGHT.start.x) * expectedK,
      6,
    );
  });

  it('kappt an flight.end, wenn Vorhersage über Flugdauer hinausgeht', () => {
    const lateFlight = { ...FLIGHT, elapsed: FLIGHT.travelDuration };
    expect(anticipatedBallPos(lateFlight, { x: 0, y: 0 })).toEqual(FLIGHT.end);
  });
});
