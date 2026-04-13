import { describe, expect, it } from 'vitest';
import {
  ballPositionFromFlight,
  flightProgress,
  isFlightComplete,
  type BallFlight,
} from './ballFlight';

const FLIGHT: BallFlight = {
  fromId: 'a',
  toId: 'b',
  start: { x: 0, y: 0 },
  end: { x: 10, y: 20 },
  duration: 1,
  elapsed: 0.5,
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
    expect(flightProgress({ ...FLIGHT, duration: 0, elapsed: 0 })).toBe(1);
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
    expect(isFlightComplete({ ...FLIGHT, elapsed: 1 })).toBe(true);
  });
});
