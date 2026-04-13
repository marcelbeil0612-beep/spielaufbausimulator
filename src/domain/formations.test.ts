import { describe, it, expect } from 'vitest';
import { FORMATION_4_3_3, FORMATION_4_4_2 } from './formations';
import { teamFromFormation } from './team';

describe('Formationen', () => {
  it('4-3-3 enthält genau elf Slots', () => {
    expect(FORMATION_4_3_3.slots).toHaveLength(11);
  });

  it('4-4-2 enthält genau elf Slots', () => {
    expect(FORMATION_4_4_2.slots).toHaveLength(11);
  });

  it('4-3-3 hat genau einen Torwart', () => {
    const gks = FORMATION_4_3_3.slots.filter((s) => s.role === 'GK');
    expect(gks).toHaveLength(1);
  });

  it('alle Positionen liegen im Feld-Koordinatenbereich [0,100]', () => {
    for (const slot of FORMATION_4_3_3.slots) {
      expect(slot.position.x).toBeGreaterThanOrEqual(0);
      expect(slot.position.x).toBeLessThanOrEqual(100);
      expect(slot.position.y).toBeGreaterThanOrEqual(0);
      expect(slot.position.y).toBeLessThanOrEqual(100);
    }
  });
});

describe('teamFromFormation', () => {
  it('Heimteam bleibt im Welt-Frame unverändert', () => {
    const team = teamFromFormation(FORMATION_4_3_3, 'home');
    const gk = team.players.find((p) => p.role === 'GK');
    expect(gk?.position).toEqual({ x: 50, y: 6 });
  });

  it('Gastteam wird an x und y gespiegelt', () => {
    const team = teamFromFormation(FORMATION_4_4_2, 'away');
    const gk = team.players.find((p) => p.role === 'GK');
    expect(gk?.position).toEqual({ x: 50, y: 94 });
  });

  it('erzeugt elf Spieler mit eindeutigen IDs', () => {
    const team = teamFromFormation(FORMATION_4_3_3, 'home');
    const ids = new Set(team.players.map((p) => p.id));
    expect(team.players).toHaveLength(11);
    expect(ids.size).toBe(11);
  });
});
