import { describe, it, expect } from 'vitest';
import type { Scene } from '@/domain/scene';
import { createInitialScene } from '@/domain/scene';
import { reactTo } from './reactTo';
import { evaluate } from './evaluate';

function movePlayerBy(
  scene: Scene,
  awayIdx: number,
  toX: number,
  toY: number,
): Scene {
  return {
    ...scene,
    away: {
      ...scene.away,
      players: scene.away.players.map((p, i) =>
        i === awayIdx ? { ...p, position: { x: toX, y: toY } } : p,
      ),
    },
  };
}

describe('evaluate', () => {
  it('open: Startszene (Ball beim TW, kein Gegner in der Nähe)', () => {
    const scene = createInitialScene();
    expect(evaluate(scene)).toBe('open');
  });

  it('pressure: nach Pass auf LIV und Pressing-Reaktion (1 Gegner im Radius)', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    const afterPass = { ...scene, ballHolderId: liv.id };
    const reacted = reactTo(afterPass);
    expect(evaluate(reacted)).toBe('pressure');
  });

  it('risky: 2 Gegner im PRESSURE_RADIUS', () => {
    const scene = createInitialScene();
    const holder = scene.home.players.find((p) => p.id === scene.ballHolderId)!;
    // Zwei Gegner nahe an den TW setzen (5 Einheiten entfernt).
    let s: Scene = movePlayerBy(scene, 0, holder.position.x + 5, holder.position.y);
    s = movePlayerBy(s, 1, holder.position.x - 5, holder.position.y);
    expect(evaluate(s)).toBe('risky');
  });

  it('risky: dirty Annahme trotz Startszene (0 Gegner im Radius)', () => {
    const scene = createInitialScene();
    const dirty: Scene = {
      ...scene,
      lastReception: { firstTouch: 'dirty', stance: 'closed' },
    };
    expect(evaluate(dirty)).toBe('risky');
  });

  it('risky: ungenauer Pass trotz Startszene', () => {
    const scene = createInitialScene();
    const imprecise: Scene = {
      ...scene,
      lastPass: { velocity: 'normal', accuracy: 'imprecise' },
    };
    expect(evaluate(imprecise)).toBe('risky');
  });

  it('loss-danger: 3 Gegner im PRESSURE_RADIUS', () => {
    const scene = createInitialScene();
    const holder = scene.home.players.find((p) => p.id === scene.ballHolderId)!;
    let s: Scene = movePlayerBy(scene, 0, holder.position.x + 5, holder.position.y);
    s = movePlayerBy(s, 1, holder.position.x - 5, holder.position.y);
    s = movePlayerBy(s, 2, holder.position.x, holder.position.y + 5);
    expect(evaluate(s)).toBe('loss-danger');
  });

  it('loss-danger: dirty Annahme + Gegner im Nahkontakt', () => {
    const scene = createInitialScene();
    const holder = scene.home.players.find((p) => p.id === scene.ballHolderId)!;
    const close = movePlayerBy(scene, 0, holder.position.x + 3, holder.position.y);
    const s: Scene = {
      ...close,
      lastReception: { firstTouch: 'dirty', stance: 'closed' },
    };
    expect(evaluate(s)).toBe('loss-danger');
  });

  it('loss-danger: scharfer Pass + dirty Annahme (ohne Nahkontakt)', () => {
    const scene = createInitialScene();
    const s: Scene = {
      ...scene,
      lastPass: { velocity: 'sharp', accuracy: 'neutral' },
      lastReception: { firstTouch: 'dirty', stance: 'closed' },
    };
    expect(evaluate(s)).toBe('loss-danger');
  });

  it('loss-danger: scharfer + ungenauer Pass unter Pressing (1 Gegner)', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB')!;
    const afterPass = { ...scene, ballHolderId: liv.id };
    const reacted = reactTo(afterPass);
    const s: Scene = {
      ...reacted,
      lastPass: { velocity: 'sharp', accuracy: 'imprecise' },
    };
    expect(evaluate(s)).toBe('loss-danger');
  });

  it('soft entschärft reinen Ungenauigkeits-Fehler ohne Druck', () => {
    const scene = createInitialScene();
    const s: Scene = {
      ...scene,
      lastPass: { velocity: 'soft', accuracy: 'imprecise' },
    };
    expect(evaluate(s)).toBe('open');
  });

  it('soft lässt dirty Annahme weiterhin risky (nicht entschärft)', () => {
    const scene = createInitialScene();
    const s: Scene = {
      ...scene,
      lastPass: { velocity: 'soft', accuracy: 'imprecise' },
      lastReception: { firstTouch: 'dirty', stance: 'closed' },
    };
    expect(evaluate(s)).toBe('risky');
  });
});
