import { describe, it, expect } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import { coverCenter, COVER_BALL_SIDE_BIAS, COVER_CENTER_SHIFT } from './coverCenter';

function sceneWithBallAtLCB() {
  const scene = createInitialScene();
  const liv = scene.home.players.find((p) => p.role === 'LCB');
  if (!liv) throw new Error('LIV fehlt');
  return { ...scene, ballHolderId: liv.id };
}

describe('coverCenter', () => {
  it('nicht-pressender Stürmer zieht Richtung x=50', () => {
    const before = sceneWithBallAtLCB();
    const holder = before.home.players.find((p) => p.id === before.ballHolderId)!;
    const strikersBefore = before.away.players.filter((p) => p.role === 'ST');

    const distSq = (x1: number, y1: number, x2: number, y2: number) =>
      (x1 - x2) ** 2 + (y1 - y2) ** 2;
    const [pressingBefore, coverBefore] = [...strikersBefore].sort(
      (a, b) =>
        distSq(a.position.x, a.position.y, holder.position.x, holder.position.y) -
        distSq(b.position.x, b.position.y, holder.position.x, holder.position.y),
    );

    const after = coverCenter(before);
    const coverAfter = after.away.players.find((p) => p.id === coverBefore.id)!;
    const pressingAfter = after.away.players.find(
      (p) => p.id === pressingBefore.id,
    )!;

    const expectedDx =
      Math.sign(50 - coverBefore.position.x) *
      Math.min(Math.abs(50 - coverBefore.position.x), COVER_CENTER_SHIFT);
    expect(coverAfter.position.x).toBeCloseTo(
      coverBefore.position.x + expectedDx,
      5,
    );
    expect(coverAfter.position.y).toBe(coverBefore.position.y);
    expect(pressingAfter.position).toEqual(pressingBefore.position);
  });

  it('zieht ball-side, wenn der Ball auf der rechten Hälfte steht', () => {
    const base = createInitialScene();
    const rcb = base.home.players.find((p) => p.role === 'RCB')!;
    const before = { ...base, ballHolderId: rcb.id, ballPos: rcb.position };
    const holder = before.home.players.find((p) => p.id === before.ballHolderId)!;
    const strikersBefore = before.away.players.filter((p) => p.role === 'ST');
    const distSq = (x1: number, y1: number, x2: number, y2: number) =>
      (x1 - x2) ** 2 + (y1 - y2) ** 2;
    const [pressingBefore, coverBefore] = [...strikersBefore].sort(
      (a, b) =>
        distSq(a.position.x, a.position.y, holder.position.x, holder.position.y) -
        distSq(b.position.x, b.position.y, holder.position.x, holder.position.y),
    );

    const after = coverCenter(before);
    const coverAfter = after.away.players.find((p) => p.id === coverBefore.id)!;

    const targetX = 50 + (rcb.position.x - 50) * COVER_BALL_SIDE_BIAS;
    const expectedDx =
      Math.sign(targetX - coverBefore.position.x) *
      Math.min(Math.abs(targetX - coverBefore.position.x), COVER_CENTER_SHIFT);
    expect(coverAfter.position.x).toBeCloseTo(coverBefore.position.x + expectedDx, 5);
    expect(targetX).toBeGreaterThan(50);
    expect(coverAfter.position.x).toBeGreaterThan(coverBefore.position.x);
    void pressingBefore;
  });

  it('ist ein No-op, wenn nur ein Stürmer existiert', () => {
    const before = createInitialScene();
    const singleStriker = {
      ...before,
      away: {
        ...before.away,
        players: before.away.players.filter(
          (p) =>
            p.role !== 'ST' ||
            p.id === before.away.players.find((q) => q.role === 'ST')!.id,
        ),
      },
    };
    const after = coverCenter(singleStriker);
    expect(after).toBe(singleStriker);
  });
});
