import { describe, it, expect } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import { distance } from '@/domain/geometry';
import { reactTo } from './reactTo';

function withBallAt(targetRole: 'LCB' | 'RCB' | 'GK') {
  const scene = createInitialScene();
  const target = scene.home.players.find((p) => p.role === targetRole);
  if (!target) throw new Error(`Spieler ${targetRole} nicht gefunden`);
  return { ...scene, ballHolderId: target.id };
}

describe('reactTo (Komposition der Regeln)', () => {
  it('ein gegnerischer Stürmer rückt nach der Reaktion erkennbar auf den Ballträger heraus', () => {
    const before = withBallAt('LCB');
    const after = reactTo(before);

    const holder = after.home.players.find((p) => p.id === before.ballHolderId);
    if (!holder) throw new Error('Ballträger verschwunden');

    const beforeStrikers = before.away.players.filter((p) => p.role === 'ST');
    const afterStrikers = after.away.players.filter((p) => p.role === 'ST');

    const pressor = afterStrikers.find((s, i) => {
      const b = beforeStrikers[i];
      return distance(s.position, holder.position) < distance(b.position, holder.position);
    });
    expect(pressor).toBeDefined();
  });

  it('kollektives Verschieben bewegt auch Nicht-Stürmer in der Startszene', () => {
    const before = withBallAt('LCB');
    const after = reactTo(before);
    const movedNonStrikers = after.away.players.filter((player, index) => {
      if (player.role === 'ST' || player.role === 'GK') return false;
      const previous = before.away.players[index]!;
      return (
        player.position.x !== previous.position.x ||
        player.position.y !== previous.position.y
      );
    });
    expect(movedNonStrikers.length).toBeGreaterThan(0);
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
