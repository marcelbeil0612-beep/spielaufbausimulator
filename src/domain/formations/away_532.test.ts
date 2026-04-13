import { describe, it, expect } from 'vitest';
import { FORMATION_5_3_2 } from './away_532';
import { teamFromFormation } from '../team';
import { getLines } from '../lines';
import { createInitialScene } from '../scene';

const DEFENSE_ROLES = ['LB', 'LCB', 'RCB', 'RB'] as const;

describe('FORMATION_5_3_2', () => {
  it('enthält elf Slots', () => {
    expect(FORMATION_5_3_2.slots).toHaveLength(11);
  });

  it('hat genau zwei Stürmer', () => {
    const st = FORMATION_5_3_2.slots.filter((s) => s.role === 'ST');
    expect(st).toHaveLength(2);
  });

  it('fünf Spieler zählen zur Abwehrlinie (Fünferkette)', () => {
    const defenders = FORMATION_5_3_2.slots.filter((s) =>
      (DEFENSE_ROLES as readonly string[]).includes(s.role),
    );
    expect(defenders).toHaveLength(5);
  });

  it('alle Labels sind eindeutig', () => {
    const labels = FORMATION_5_3_2.slots.map((s) => s.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('alle Positionen liegen im Feldbereich [0,100]', () => {
    for (const slot of FORMATION_5_3_2.slots) {
      expect(slot.position.x).toBeGreaterThanOrEqual(0);
      expect(slot.position.x).toBeLessThanOrEqual(100);
      expect(slot.position.y).toBeGreaterThanOrEqual(0);
      expect(slot.position.y).toBeLessThanOrEqual(100);
    }
  });

  it('Linien-Reihenfolge defense < midfield < attack', () => {
    const team = teamFromFormation(FORMATION_5_3_2, 'home');
    const lines = getLines(team);
    expect(lines.defense).toBeLessThan(lines.midfield);
    expect(lines.midfield).toBeLessThan(lines.attack);
  });
});

describe('createInitialScene mit awayFormation 5-3-2', () => {
  it('baut 5-3-2 im Auswärtsteam', () => {
    const scene = createInitialScene(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      '5-3-2',
    );
    expect(scene.away.formation).toBe('5-3-2');
    expect(scene.away.players).toHaveLength(11);
  });
});
