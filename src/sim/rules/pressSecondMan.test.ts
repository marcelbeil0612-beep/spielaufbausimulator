import { describe, expect, it } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import { distance } from '@/domain/geometry';
import {
  pressSecondMan,
  SECOND_MAN_PRESS_FACTOR,
} from './pressSecondMan';
import { PRESS_DISTANCE } from './pressBallHolder';

function sceneAtLCB() {
  const scene = createInitialScene();
  const lcb = scene.home.players.find((p) => p.role === 'LCB');
  if (!lcb) throw new Error('LCB fehlt');
  return { ...scene, ballHolderId: lcb.id, ballPos: lcb.position };
}

describe('pressSecondMan', () => {
  it('zieht einen Mittelfeldspieler in Richtung des nächst-anspielbaren Mitspielers', () => {
    const before = sceneAtLCB();
    const after = pressSecondMan(before);

    const movers = before.away.players
      .map((p) => {
        const post = after.away.players.find((q) => q.id === p.id)!;
        return { id: p.id, role: p.role, before: p.position, after: post.position };
      })
      .filter(
        (m) => m.before.x !== m.after.x || m.before.y !== m.after.y,
      );

    expect(movers).toHaveLength(1);
    const mover = movers[0]!;
    expect(['CDM', 'LCM', 'RCM', 'CAM', 'LM', 'RM']).toContain(mover.role);

    // Der Mover steht nach dem Schritt näher an einem Heimspieler (≠ Holder)
    // als vorher und hält Mindestabstand `PRESS_DISTANCE/2`.
    const distancesBefore = before.home.players
      .filter((p) => p.id !== before.ballHolderId && p.role !== 'GK')
      .map((p) => distance(p.position, mover.before));
    const distancesAfter = before.home.players
      .filter((p) => p.id !== before.ballHolderId && p.role !== 'GK')
      .map((p) => distance(p.position, mover.after));
    expect(Math.min(...distancesAfter)).toBeLessThan(Math.min(...distancesBefore));
    expect(Math.min(...distancesAfter)).toBeGreaterThanOrEqual(
      PRESS_DISTANCE * SECOND_MAN_PRESS_FACTOR - 0.5,
    );
  });

  it('kein Move, wenn keine freie Anschlussstation existiert', () => {
    const base = sceneAtLCB();
    // Alle Mitspieler vom Ballträger weit weg → SUPPORT_RANGE schluckt sie.
    const isolated = {
      ...base,
      home: {
        ...base.home,
        players: base.home.players.map((p) =>
          p.id === base.ballHolderId || p.role === 'GK'
            ? p
            : { ...p, position: { x: 95, y: 95 } },
        ),
      },
    };
    const after = pressSecondMan(isolated);
    expect(after).toBe(isolated);
  });
});
