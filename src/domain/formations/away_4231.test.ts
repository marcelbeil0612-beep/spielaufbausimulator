import { describe, it, expect } from 'vitest';
import { FORMATION_4_2_3_1 } from './away_4231';
import { teamFromFormation } from '../team';
import { getLines } from '../lines';
import { createInitialScene } from '../scene';

describe('FORMATION_4_2_3_1', () => {
  it('enthält elf Slots', () => {
    expect(FORMATION_4_2_3_1.slots).toHaveLength(11);
  });

  it('hat genau einen Torwart und einen Stürmer', () => {
    const roles = FORMATION_4_2_3_1.slots.map((s) => s.role);
    expect(roles.filter((r) => r === 'GK')).toHaveLength(1);
    expect(roles.filter((r) => r === 'ST')).toHaveLength(1);
  });

  it('enthält eine Doppelsechs und genau eine Zehn', () => {
    const roles = FORMATION_4_2_3_1.slots.map((s) => s.role);
    expect(roles.filter((r) => r === 'CDM')).toHaveLength(2);
    expect(roles.filter((r) => r === 'CAM')).toHaveLength(1);
  });

  it('alle Labels sind eindeutig', () => {
    const labels = FORMATION_4_2_3_1.slots.map((s) => s.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('alle Positionen liegen im Feldbereich [0,100]', () => {
    for (const slot of FORMATION_4_2_3_1.slots) {
      expect(slot.position.x).toBeGreaterThanOrEqual(0);
      expect(slot.position.x).toBeLessThanOrEqual(100);
      expect(slot.position.y).toBeGreaterThanOrEqual(0);
      expect(slot.position.y).toBeLessThanOrEqual(100);
    }
  });

  it('Linien-Reihenfolge defense < midfield < attack (Template-Frame)', () => {
    const team = teamFromFormation(FORMATION_4_2_3_1, 'home');
    const lines = getLines(team);
    expect(lines.defense).toBeLessThan(lines.midfield);
    expect(lines.midfield).toBeLessThan(lines.attack);
  });
});

describe('createInitialScene mit awayFormation 4-2-3-1', () => {
  it('baut 4-2-3-1 im Auswärtsteam', () => {
    const scene = createInitialScene(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      '4-2-3-1',
    );
    expect(scene.away.formation).toBe('4-2-3-1');
    expect(scene.away.players).toHaveLength(11);
  });

  it('Default-Szene bleibt 4-4-2', () => {
    const scene = createInitialScene();
    expect(scene.away.formation).toBe('4-4-2');
  });
});
