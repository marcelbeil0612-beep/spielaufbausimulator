import { describe, it, expect } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import { distance } from '@/domain/geometry';
import { reactTo, PRESS_DISTANCE } from './reactTo';

function withBallAt(targetRole: 'LCB' | 'RCB' | 'GK') {
  const scene = createInitialScene();
  const target = scene.home.players.find((p) => p.role === targetRole);
  if (!target) throw new Error(`Spieler ${targetRole} nicht gefunden`);
  return { ...scene, ballHolderId: target.id };
}

describe('reactTo (Komposition der Regeln)', () => {
  it('pressender Stürmer steht nach der Reaktion auf PRESS_DISTANCE zum Ballträger', () => {
    const before = withBallAt('LCB');
    const after = reactTo(before);

    const holder = after.home.players.find((p) => p.id === before.ballHolderId);
    if (!holder) throw new Error('Ballträger verschwunden');

    const beforeStrikers = before.away.players.filter((p) => p.role === 'ST');
    const afterStrikers = after.away.players.filter((p) => p.role === 'ST');

    const pressor = afterStrikers.find((s, i) => {
      const b = beforeStrikers[i];
      const d = distance(s.position, holder.position);
      const moved =
        s.position.x !== b.position.x || s.position.y !== b.position.y;
      return moved && Math.abs(d - PRESS_DISTANCE) < 1e-5;
    });
    expect(pressor).toBeDefined();
  });

  it('andere Feldspieler als Stürmer bleiben unverändert (Start-Szene ohne Überspielung)', () => {
    const before = withBallAt('LCB');
    const after = reactTo(before);
    const nonST = (team: typeof before.away) =>
      team.players.filter((p) => p.role !== 'ST');
    expect(nonST(after.away)).toEqual(nonST(before.away));
    expect(after.home).toEqual(before.home);
  });

  it('ist eine reine Funktion – mutiert die Eingabe nicht', () => {
    const before = withBallAt('LCB');
    const snapshot = JSON.stringify(before);
    reactTo(before);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('beide Stürmer bewegen sich in der Startszene (presser + zentrale Absicherung)', () => {
    const before = withBallAt('LCB');
    const after = reactTo(before);
    const beforeStrikers = before.away.players.filter((p) => p.role === 'ST');
    const afterStrikers = after.away.players.filter((p) => p.role === 'ST');
    const movedCount = afterStrikers.filter((s, i) => {
      const b = beforeStrikers[i];
      return s.position.x !== b.position.x || s.position.y !== b.position.y;
    }).length;
    expect(movedCount).toBe(2);
  });
});
