import { describe, expect, it } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import type { Scene } from '@/domain/scene';
import { distance } from '@/domain/geometry';
import { reactTo } from './reactTo';

function passToLIV(scene: Scene): Scene {
  const liv = scene.home.players.find((p) => p.role === 'LCB');
  if (!liv) throw new Error('LIV fehlt');
  return { ...scene, ballHolderId: liv.id };
}

describe('reactTo ohne options (Backward-Kompatibilität)', () => {
  it('gleiches Ergebnis wie reactTo mit options=undefined', () => {
    const scene = passToLIV(createInitialScene());
    expect(reactTo(scene)).toEqual(reactTo(scene, undefined));
  });

  it('gleiches Ergebnis wie reactTo mit sehr großem dt', () => {
    const scene = passToLIV(createInitialScene());
    expect(reactTo(scene)).toEqual(reactTo(scene, { dt: 10 }));
  });
});

describe('reactTo mit dt', () => {
  it('dt=0 → Szene unverändert', () => {
    const scene = passToLIV(createInitialScene());
    const after = reactTo(scene, { dt: 0 });
    expect(after.away.players).toEqual(scene.away.players);
  });

  it('kleines dt bewegt Presser weniger als volle Reaktion', () => {
    const scene = passToLIV(createInitialScene());
    const holder = scene.home.players.find((p) => p.role === 'LCB')!;
    const stBefore = scene.away.players.find((p) => p.role === 'ST')!;
    const distBefore = distance(stBefore.position, holder.position);

    const afterFull = reactTo(scene);
    const afterShort = reactTo(scene, { dt: 0.3 });

    const stFull = afterFull.away.players.find((p) => p.id === stBefore.id)!;
    const stShort = afterShort.away.players.find((p) => p.id === stBefore.id)!;

    const distFull = distance(stFull.position, holder.position);
    const distShort = distance(stShort.position, holder.position);

    expect(distShort).toBeLessThan(distBefore);
    expect(distShort).toBeGreaterThan(distFull);
  });

  it('mittleres dt liegt monoton zwischen kurz und lang', () => {
    const scene = passToLIV(createInitialScene());
    const holder = scene.home.players.find((p) => p.role === 'LCB')!;
    const stBefore = scene.away.players.find((p) => p.role === 'ST')!;

    const a = reactTo(scene, { dt: 0.3 });
    const b = reactTo(scene, { dt: 0.6 });
    const c = reactTo(scene, { dt: 1.5 });

    const dA = distance(
      a.away.players.find((p) => p.id === stBefore.id)!.position,
      holder.position,
    );
    const dB = distance(
      b.away.players.find((p) => p.id === stBefore.id)!.position,
      holder.position,
    );
    const dC = distance(
      c.away.players.find((p) => p.id === stBefore.id)!.position,
      holder.position,
    );

    expect(dB).toBeLessThanOrEqual(dA);
    expect(dC).toBeLessThanOrEqual(dB);
  });

  it('Gesamtdistanz der Spielerbewegung skaliert monoton mit dt', () => {
    const scene = passToLIV(createInitialScene());
    const totalShift = (after: Scene): number =>
      after.away.players.reduce((sum, p) => {
        const before = scene.away.players.find((x) => x.id === p.id)!;
        return sum + distance(before.position, p.position);
      }, 0);

    const s0 = totalShift(reactTo(scene, { dt: 0 }));
    const s1 = totalShift(reactTo(scene, { dt: 0.3 }));
    const s2 = totalShift(reactTo(scene, { dt: 0.8 }));
    const s3 = totalShift(reactTo(scene, { dt: 5 }));

    expect(s0).toBe(0);
    expect(s1).toBeLessThanOrEqual(s2);
    expect(s2).toBeLessThanOrEqual(s3);
  });
});
