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

  it('ballnächster Mittelfeldspieler rückt voll, ballferner gedämpft zurück', () => {
    const scene = createInitialScene();
    const forward = scene.home.players.find((p) => p.role === 'ST');
    if (!forward) throw new Error('ST fehlt');
    // Ball klar vor der Linie und exakt über RCM (x=60), damit dieser
    // ballNearness=1 hat und vollen Rückzug bekommt.
    const overplayed = {
      ...scene,
      ballHolderId: forward.id,
      ballPos: { x: 60, y: forward.position.y },
    };
    const after = compactLine(overplayed);

    const midfieldRoles = ['CDM', 'LCM', 'RCM', 'CAM', 'LM', 'RM'];
    const before = overplayed.away.players.filter((p) =>
      midfieldRoles.includes(p.role),
    );
    const shifted = after.away.players.filter((p) =>
      midfieldRoles.includes(p.role),
    );

    const distances = before.map((p, i) => ({
      dx: Math.abs(p.position.x - overplayed.ballPos.x),
      delta: shifted[i].position.y - p.position.y,
    }));
    const nearest = distances.reduce((a, b) => (a.dx <= b.dx ? a : b));
    const farthest = distances.reduce((a, b) => (a.dx >= b.dx ? a : b));

    // Ballnächster bekommt nahezu vollen Rückzug.
    expect(nearest.delta).toBeCloseTo(LINE_RECOVERY_OFFSET, 1);
    // Ballfernster bewegt sich deutlich weniger.
    expect(farthest.delta).toBeLessThan(nearest.delta);
    expect(farthest.delta).toBeGreaterThan(0);
    // X bleibt für alle gleich.
    for (let i = 0; i < before.length; i++) {
      expect(shifted[i].position.x).toBe(before[i].position.x);
    }
  });
});
