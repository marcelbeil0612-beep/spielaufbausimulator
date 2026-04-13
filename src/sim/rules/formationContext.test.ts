import { describe, it, expect } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import type { Scene } from '@/domain/scene';
import type { FormationPattern } from '@/domain/types';
import { pressBallHolder } from './pressBallHolder';
import { coverCenter } from './coverCenter';

function sceneFor(formation: FormationPattern): Scene {
  const scene = createInitialScene(
    'narrow',
    'neutral',
    undefined,
    undefined,
    'high',
    formation,
  );
  const liv = scene.home.players.find((p) => p.role === 'LCB');
  if (!liv) throw new Error('LIV fehlt');
  return { ...scene, ballHolderId: liv.id };
}

function movedIds(before: Scene, after: Scene): string[] {
  const moved: string[] = [];
  for (const p of after.away.players) {
    const b = before.away.players.find((q) => q.id === p.id)!;
    if (b.position.x !== p.position.x || b.position.y !== p.position.y) {
      moved.push(p.id);
    }
  }
  return moved;
}

describe('Formation-abhängiger reactTo', () => {
  it('4-4-2: ballnächster Stürmer presst (genau einer)', () => {
    const before = sceneFor('4-4-2');
    const after = pressBallHolder(before);
    const moved = movedIds(before, after);
    expect(moved).toHaveLength(1);
    const mover = after.away.players.find((p) => p.id === moved[0])!;
    expect(mover.role).toBe('ST');
  });

  it('4-4-2: zweiter Stürmer sichert Zentrum', () => {
    const before = sceneFor('4-4-2');
    const after = coverCenter(before);
    const moved = movedIds(before, after);
    expect(moved).toHaveLength(1);
    const mover = after.away.players.find((p) => p.id === moved[0])!;
    expect(mover.role).toBe('ST');
  });

  it('4-2-3-1: ballnaher Sechser presst (kein Stürmer)', () => {
    const before = sceneFor('4-2-3-1');
    const after = pressBallHolder(before);
    const moved = movedIds(before, after);
    expect(moved).toHaveLength(1);
    const mover = after.away.players.find((p) => p.id === moved[0])!;
    expect(mover.role).toBe('CDM');
  });

  it('4-2-3-1: CAM schiebt Richtung Mitte (nicht der Stürmer)', () => {
    const base = sceneFor('4-2-3-1');
    // Verschiebe den CAM künstlich aus der Mitte, damit die Regel
    // einen sichtbaren Schritt ausführt (Start auf x=50 wäre ein No-op).
    const before: Scene = {
      ...base,
      away: {
        ...base.away,
        players: base.away.players.map((p) =>
          p.role === 'CAM'
            ? { ...p, position: { x: p.position.x + 10, y: p.position.y } }
            : p,
        ),
      },
    };
    const after = coverCenter(before);
    const moved = movedIds(before, after);
    expect(moved.length).toBe(1);
    const mover = after.away.players.find((p) => p.id === moved[0])!;
    expect(mover.role).toBe('CAM');
  });

  it('5-3-2: ein Stürmer presst, zweiter Stürmer sichert Zentrum', () => {
    const before = sceneFor('5-3-2');
    const afterPress = pressBallHolder(before);
    const pressMoved = movedIds(before, afterPress);
    expect(pressMoved).toHaveLength(1);
    const presser = afterPress.away.players.find((p) => p.id === pressMoved[0])!;
    expect(presser.role).toBe('ST');

    const afterCover = coverCenter(before);
    const coverMoved = movedIds(before, afterCover);
    expect(coverMoved).toHaveLength(1);
    const coverer = afterCover.away.players.find(
      (p) => p.id === coverMoved[0],
    )!;
    expect(coverer.role).toBe('ST');
    // presser und coverer sind verschiedene Stürmer
    expect(coverer.id).not.toBe(presser.id);
  });
});
