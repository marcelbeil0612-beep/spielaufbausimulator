import { describe, expect, it } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import type { Scene } from '@/domain/scene';
import { collectiveShift } from './collectiveShift';

function sceneWithBallAt(role: 'GK' | 'LCB' | 'ST', pressIntensity: Scene['pressIntensity'] = 'high'): Scene {
  const scene = createInitialScene('narrow', 'neutral', undefined, undefined, pressIntensity);
  const holder = scene.home.players.find((p) => p.role === role);
  if (!holder) throw new Error(`${role} fehlt`);
  return {
    ...scene,
    ballHolderId: holder.id,
    ballPos: holder.position,
  };
}

describe('collectiveShift', () => {
  it('verschiebt mehrere gegnerische Feldspieler gemeinsam', () => {
    const before = sceneWithBallAt('LCB');
    const after = collectiveShift(before);
    const moved = after.away.players.filter((player, index) => {
      if (player.role === 'GK') return false;
      const previous = before.away.players[index]!;
      return (
        player.position.x !== previous.position.x ||
        player.position.y !== previous.position.y
      );
    });
    expect(moved.length).toBeGreaterThanOrEqual(6);
  });

  it('hohes Pressing verschiebt den Block stärker als tiefer Block', () => {
    const high = collectiveShift(sceneWithBallAt('GK', 'high'));
    const low = collectiveShift(sceneWithBallAt('GK', 'low'));
    const highSt = high.away.players.find((p) => p.role === 'ST')!;
    const lowSt = low.away.players.find((p) => p.role === 'ST')!;
    const highBefore = sceneWithBallAt('GK', 'high').away.players.find((p) => p.id === highSt.id)!;
    const lowBefore = sceneWithBallAt('GK', 'low').away.players.find((p) => p.id === lowSt.id)!;
    const highShift = highBefore.position.y - highSt.position.y;
    const lowShift = lowBefore.position.y - lowSt.position.y;
    expect(highShift).toBeGreaterThan(lowShift);
  });

  it('ballnahe Spieler verschieben seitlich stärker als ballferne', () => {
    const scene = sceneWithBallAt('LCB');
    const ballWideLeft = { ...scene, ballPos: { x: 18, y: 22 } };
    const after = collectiveShift(ballWideLeft);
    const near = after.away.players.find((p) => p.role === 'LB')!;
    const far = after.away.players.find((p) => p.role === 'RB')!;
    const nearBefore = ballWideLeft.away.players.find((p) => p.id === near.id)!;
    const farBefore = ballWideLeft.away.players.find((p) => p.id === far.id)!;
    expect(Math.abs(near.position.x - nearBefore.position.x)).toBeGreaterThan(
      Math.abs(far.position.x - farBefore.position.x),
    );
  });
});
