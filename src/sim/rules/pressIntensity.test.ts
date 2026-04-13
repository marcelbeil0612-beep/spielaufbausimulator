import { describe, it, expect } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import type { Scene } from '@/domain/scene';
import { distance } from '@/domain/geometry';
import { pressBallHolder } from './pressBallHolder';
import { coverCenter } from './coverCenter';
import { compactLine } from './compactLine';
import { PRESS_INTENSITY_FACTORS } from './pressIntensity';

function sceneAtGK(intensity: Scene['pressIntensity']): Scene {
  // Ballträger = TW: die Stürmer stehen weit genug weg, damit alle drei
  // Intensitätsstufen echten Bewegungsspielraum haben (Distanz ~23).
  return createInitialScene('narrow', 'neutral', undefined, undefined, intensity);
}

function sceneWithBallAtLCB(intensity: Scene['pressIntensity']): Scene {
  const scene = createInitialScene('narrow', 'neutral', undefined, undefined, intensity);
  const liv = scene.home.players.find((p) => p.role === 'LCB');
  if (!liv) throw new Error('LIV fehlt');
  return { ...scene, ballHolderId: liv.id };
}

function movedStriker(before: Scene, after: Scene) {
  const bs = before.away.players.filter((p) => p.role === 'ST');
  const as = after.away.players.filter((p) => p.role === 'ST');
  return as.find(
    (s, i) =>
      s.position.x !== bs[i].position.x || s.position.y !== bs[i].position.y,
  );
}

describe('PressIntensity', () => {
  it('Faktoren-Map enthält high/mid/low', () => {
    expect(PRESS_INTENSITY_FACTORS.high.press).toBe(1);
    expect(PRESS_INTENSITY_FACTORS.mid.press).toBeGreaterThan(1);
    expect(PRESS_INTENSITY_FACTORS.low.press).toBeGreaterThan(
      PRESS_INTENSITY_FACTORS.mid.press,
    );
  });

  it('pressBallHolder: je geringer die Intensität, desto größer der Zielabstand', () => {
    const distances = (['high', 'mid', 'low'] as const).map((intensity) => {
      const before = sceneAtGK(intensity);
      const after = pressBallHolder(before);
      const holder = after.home.players.find((p) => p.id === before.ballHolderId)!;
      const moved = movedStriker(before, after);
      expect(moved).toBeDefined();
      return distance(moved!.position, holder.position);
    });
    const [high, mid, low] = distances;
    expect(mid).toBeGreaterThan(high);
    expect(low).toBeGreaterThan(mid);
  });

  it('coverCenter: Schrittweite sinkt mit fallender Intensität', () => {
    const shifts = (['high', 'mid', 'low'] as const).map((intensity) => {
      const before = sceneWithBallAtLCB(intensity);
      const pressing = movedStriker(before, pressBallHolder(before));
      const after = coverCenter(before);
      const other = after.away.players.find(
        (p) => p.role === 'ST' && p.id !== pressing?.id,
      )!;
      const matchingBefore = before.away.players.find((p) => p.id === other.id)!;
      return Math.abs(other.position.x - matchingBefore.position.x);
    });
    const [high, mid, low] = shifts;
    expect(high).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(low);
  });

  it('compactLine: Rückzug fällt mit Intensität ab', () => {
    const shifts = (['high', 'mid', 'low'] as const).map((intensity) => {
      const scene = createInitialScene('narrow', 'neutral', undefined, undefined, intensity);
      const st = scene.home.players.find((p) => p.role === 'ST')!;
      const overplayed = { ...scene, ballHolderId: st.id };
      const after = compactLine(overplayed);
      const midBefore = overplayed.away.players.find((p) => p.role === 'LCM')!;
      const midAfter = after.away.players.find((p) => p.id === midBefore.id)!;
      return midAfter.position.y - midBefore.position.y;
    });
    const [high, mid, low] = shifts;
    expect(high).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(low);
  });
});
