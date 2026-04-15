import { describe, expect, it } from 'vitest';
import {
  BALL_SPEED_BY_VELOCITY,
  ballFlightTime,
  maxShiftDistance,
  PLAYER_SHIFT_SPEED_BY_ROLE,
} from './physics';

describe('physics: Ballgeschwindigkeit', () => {
  it('sharp > normal > soft', () => {
    expect(BALL_SPEED_BY_VELOCITY.sharp).toBeGreaterThan(
      BALL_SPEED_BY_VELOCITY.normal,
    );
    expect(BALL_SPEED_BY_VELOCITY.normal).toBeGreaterThan(
      BALL_SPEED_BY_VELOCITY.soft,
    );
  });
});

describe('physics: ballFlightTime', () => {
  it('Distanz 22 m bei normal (22 m/s) dauert 1 s', () => {
    const speed = BALL_SPEED_BY_VELOCITY.normal;
    const t = ballFlightTime({ x: 0, y: 0 }, { x: 0, y: 18 }, 'normal');
    const expected = 18 / speed;
    expect(expected).toBeLessThan(1);
    expect(t).toBeCloseTo(expected, 5);
  });

  it('Distanz 22 m bei normal dauert exakt 1 s', () => {
    const t = ballFlightTime({ x: 0, y: 0 }, { x: 0, y: 22 }, 'normal');
    expect(t).toBeCloseTo(1, 5);
  });

  it('sharper Pass verkürzt Flugzeit', () => {
    const from = { x: 20, y: 20 };
    const to = { x: 60, y: 60 };
    const tSharp = ballFlightTime(from, to, 'sharp');
    const tNormal = ballFlightTime(from, to, 'normal');
    const tSoft = ballFlightTime(from, to, 'soft');
    expect(tSharp).toBeLessThan(tNormal);
    expect(tNormal).toBeLessThan(tSoft);
  });

  it('identische Punkte → Flugzeit 0', () => {
    const t = ballFlightTime({ x: 50, y: 50 }, { x: 50, y: 50 }, 'normal');
    expect(t).toBe(0);
  });
});

describe('physics: maxShiftDistance', () => {
  it('0 s ergibt 0 m', () => {
    expect(maxShiftDistance(0, 'ST')).toBe(0);
  });

  it('negatives dt ergibt 0 m', () => {
    expect(maxShiftDistance(-1, 'ST')).toBe(0);
  });

  it('Stürmer schafft in 1 s seine Rollen-Geschwindigkeit', () => {
    expect(maxShiftDistance(1, 'ST')).toBe(
      PLAYER_SHIFT_SPEED_BY_ROLE.ST,
    );
  });

  it('Torwart ist langsamer als Flügelspieler', () => {
    expect(maxShiftDistance(1, 'GK')).toBeLessThan(
      maxShiftDistance(1, 'LW'),
    );
  });

  it('linear in der Zeit', () => {
    const one = maxShiftDistance(1, 'CDM');
    const two = maxShiftDistance(2, 'CDM');
    expect(two).toBeCloseTo(2 * one, 5);
  });
});

describe('physics: Plausibilitäts-Check Ball vs. Spieler', () => {
  it('Ball ist bei normal-Pass schneller als jeder Spieler', () => {
    for (const role of Object.keys(
      PLAYER_SHIFT_SPEED_BY_ROLE,
    ) as Array<keyof typeof PLAYER_SHIFT_SPEED_BY_ROLE>) {
      expect(BALL_SPEED_BY_VELOCITY.normal).toBeGreaterThan(
        PLAYER_SHIFT_SPEED_BY_ROLE[role],
      );
    }
  });

  it('Ball ist bei normal-Pass klar schneller als taktisches Verschieben', () => {
    const maxPlayerSpeed = Math.max(...Object.values(PLAYER_SHIFT_SPEED_BY_ROLE));
    expect(BALL_SPEED_BY_VELOCITY.normal).toBeGreaterThan(maxPlayerSpeed * 3);
  });
});
