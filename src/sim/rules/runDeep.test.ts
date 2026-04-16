import { describe, expect, it } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import { sceneReducer } from '@/state/sceneReducer';
import { suggestMoves } from '../suggestMoves';
import { runDeep } from './runDeep';

describe('runDeep', () => {
  it('ohne Ballflug ein No-op', () => {
    const scene = createInitialScene();
    expect(runDeep(scene)).toBe(scene);
  });

  it('bewegt den between_lines-Kandidaten Richtung Zwischenlinienraum', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB')!;
    const flying = sceneReducer(scene, { type: 'pass', targetId: liv.id });
    const suggestion = suggestMoves(flying).find(
      (m) => m.code === 'between_lines',
    );
    if (!suggestion) throw new Error('between_lines-Vorschlag erwartet');

    const midFlight = {
      ...flying,
      ballFlight: {
        ...flying.ballFlight!,
        elapsed: flying.ballFlight!.travelDuration * 0.5,
      },
    };
    const after = runDeep(midFlight);
    const before = flying.home.players.find((p) => p.id === suggestion.playerId)!;
    const post = after.home.players.find((p) => p.id === suggestion.playerId)!;

    // Bewegung Richtung Zielraum (y wächst, da Heim nach oben spielt).
    expect(post.position.y).toBeGreaterThan(before.position.y);
    // Überspringt das Ziel nicht.
    expect(post.position.y).toBeLessThanOrEqual(suggestion.to.y + 0.0001);
  });
});
