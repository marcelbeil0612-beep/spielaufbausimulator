import { describe, it, expect } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import {
  LANE_BLOCK_RADIUS,
  LANE_THREAT_RADIUS,
  assessPassLane,
  assessPassLaneInScene,
} from './passLane';

describe('assessPassLane', () => {
  const from = { x: 50, y: 6 };
  const to = { x: 36, y: 18 };

  it('keine Gegner → closest=Infinity, 0 blockers/threats', () => {
    const r = assessPassLane(from, to, []);
    expect(r.closest).toBe(Infinity);
    expect(r.blockers).toBe(0);
    expect(r.threats).toBe(0);
  });

  it('Gegner direkt auf der Linie → blocker', () => {
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const r = assessPassLane(from, to, [mid]);
    expect(r.closest).toBeCloseTo(0, 5);
    expect(r.blockers).toBe(1);
    expect(r.threats).toBe(0);
  });

  it('Gegner knapp außerhalb des Block-Radius, aber im Threat-Band → threat', () => {
    const opp = { x: 43, y: 17 };
    const r = assessPassLane(from, to, [opp]);
    expect(r.blockers).toBe(0);
    expect(r.threats).toBe(1);
    expect(r.closest).toBeGreaterThan(LANE_BLOCK_RADIUS);
    expect(r.closest).toBeLessThanOrEqual(LANE_THREAT_RADIUS);
  });

  it('Gegner weit weg → weder blocker noch threat', () => {
    const r = assessPassLane(from, to, [{ x: 90, y: 80 }]);
    expect(r.blockers).toBe(0);
    expect(r.threats).toBe(0);
  });

  it('Gegner hinter dem Empfänger (Lot außerhalb) zählt nur, wenn nah am Endpunkt', () => {
    const r = assessPassLane(from, to, [{ x: 36, y: 30 }]);
    // Abstand zum nächsten Endpunkt (Empfänger) = 12 → weder blocker noch threat.
    expect(r.blockers).toBe(0);
    expect(r.threats).toBe(0);
  });
});

describe('assessPassLaneInScene', () => {
  it('Startszene → Pass TW → LIV ist ungestört (keine blockers/threats)', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB')!;
    const r = assessPassLaneInScene(scene, liv.id)!;
    expect(r.blockers).toBe(0);
    expect(r.threats).toBe(0);
  });

  it('unbekannte targetId → undefined', () => {
    const scene = createInitialScene();
    expect(assessPassLaneInScene(scene, 'nope')).toBeUndefined();
  });
});
