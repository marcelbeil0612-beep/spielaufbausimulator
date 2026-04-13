import { describe, it, expect } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import { distance } from '@/domain/geometry';
import { pressBallHolder, PRESS_DISTANCE } from './pressBallHolder';

function sceneWithBallAtLCB() {
  const scene = createInitialScene();
  const liv = scene.home.players.find((p) => p.role === 'LCB');
  if (!liv) throw new Error('LIV fehlt');
  return { ...scene, ballHolderId: liv.id };
}

describe('pressBallHolder', () => {
  it('ballnächster Stürmer steht hinterher auf PRESS_DISTANCE zum Ballträger', () => {
    const before = sceneWithBallAtLCB();
    const after = pressBallHolder(before);
    const holder = after.home.players.find((p) => p.id === before.ballHolderId);
    if (!holder) throw new Error('Ballträger verschwunden');

    const beforeStrikers = before.away.players.filter((p) => p.role === 'ST');
    const afterStrikers = after.away.players.filter((p) => p.role === 'ST');
    const moved = afterStrikers.find(
      (s, i) =>
        s.position.x !== beforeStrikers[i].position.x ||
        s.position.y !== beforeStrikers[i].position.y,
    );
    expect(moved).toBeDefined();
    if (!moved) return;
    expect(distance(moved.position, holder.position)).toBeCloseTo(
      PRESS_DISTANCE,
      5,
    );
  });

  it('bewegt genau einen Stürmer', () => {
    const before = sceneWithBallAtLCB();
    const after = pressBallHolder(before);
    const beforeStrikers = before.away.players.filter((p) => p.role === 'ST');
    const afterStrikers = after.away.players.filter((p) => p.role === 'ST');
    const movedCount = afterStrikers.filter(
      (s, i) =>
        s.position.x !== beforeStrikers[i].position.x ||
        s.position.y !== beforeStrikers[i].position.y,
    ).length;
    expect(movedCount).toBe(1);
  });
});
