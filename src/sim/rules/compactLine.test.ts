import { describe, it, expect } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import { compactLine, LINE_RECOVERY_OFFSET } from './compactLine';

describe('compactLine', () => {
  it('keine Kompaktierung, wenn Mittelfeldlinie nicht überspielt', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    const pressed = { ...scene, ballHolderId: liv.id };
    const after = compactLine(pressed);
    expect(after).toBe(pressed);
  });

  it('überspielte Mittelfeldlinie rückt um LINE_RECOVERY_OFFSET Richtung eigenem Tor', () => {
    const scene = createInitialScene();
    // Platziere Ballträger weit vor der Mittelfeldlinie des Gegners.
    const forward = scene.home.players.find((p) => p.role === 'ST');
    if (!forward) throw new Error('ST fehlt');
    const overplayed = { ...scene, ballHolderId: forward.id };
    const after = compactLine(overplayed);

    const midfieldRoles = ['CDM', 'LCM', 'RCM', 'CAM', 'LM', 'RM'];
    const before = overplayed.away.players.filter((p) =>
      midfieldRoles.includes(p.role),
    );
    const shifted = after.away.players.filter((p) =>
      midfieldRoles.includes(p.role),
    );
    for (let i = 0; i < before.length; i++) {
      expect(shifted[i].position.y).toBeCloseTo(
        before[i].position.y + LINE_RECOVERY_OFFSET,
        5,
      );
      expect(shifted[i].position.x).toBe(before[i].position.x);
    }
  });
});
