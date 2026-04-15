import { describe, expect, it } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import { sceneReducer } from '@/state/sceneReducer';
import { supportOwnPlay } from './supportOwnPlay';

describe('supportOwnPlay', () => {
  it('ist ohne laufenden Ballflug ein No-op', () => {
    const scene = createInitialScene();
    expect(supportOwnPlay(scene)).toBe(scene);
  });

  it('verschiebt mehrere eigene Feldspieler leicht mit', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB')!;
    const flying = sceneReducer(scene, { type: 'pass', targetId: liv.id });
    const shifted = supportOwnPlay(flying);
    const moved = shifted.home.players.filter((player, index) => {
      if (player.role === 'GK' || player.id === shifted.ballHolderId) return false;
      const before = flying.home.players[index]!;
      return (
        player.position.x !== before.position.x ||
        player.position.y !== before.position.y
      );
    });
    expect(moved.length).toBeGreaterThanOrEqual(3);
  });

  it('ballnahe Spieler reagieren seitlich stärker als ballferne', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB')!;
    const flying = sceneReducer(scene, { type: 'pass', targetId: liv.id });
    const shifted = supportOwnPlay(flying);
    const near = shifted.home.players.find((p) => p.role === 'LB')!;
    const far = shifted.home.players.find((p) => p.role === 'RB')!;
    const nearBefore = flying.home.players.find((p) => p.id === near.id)!;
    const farBefore = flying.home.players.find((p) => p.id === far.id)!;
    expect(Math.abs(near.position.x - nearBefore.position.x)).toBeGreaterThan(
      Math.abs(far.position.x - farBefore.position.x),
    );
  });
});
