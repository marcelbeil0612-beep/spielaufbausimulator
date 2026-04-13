import { describe, it, expect } from 'vitest';
import { FORMATION_4_3_3, FORMATION_4_4_2 } from './formations';
import { teamFromFormation } from './team';
import { getLines } from './lines';

describe('getLines', () => {
  it('4-3-3 Heim: defense < midfield < attack', () => {
    const home = teamFromFormation(FORMATION_4_3_3, 'home');
    const lines = getLines(home);
    expect(lines.defense).toBeLessThan(lines.midfield);
    expect(lines.midfield).toBeLessThan(lines.attack);
  });

  it('4-3-3 Heim: exakte Mittelwerte', () => {
    const home = teamFromFormation(FORMATION_4_3_3, 'home');
    const lines = getLines(home);
    expect(lines.defense).toBeCloseTo((22 + 18 + 18 + 22) / 4, 5);
    expect(lines.midfield).toBeCloseTo((38 + 52 + 52) / 3, 5);
    expect(lines.attack).toBeCloseTo((76 + 82 + 76) / 3, 5);
  });

  it('4-4-2 Heim: defense < midfield < attack', () => {
    const home = teamFromFormation(FORMATION_4_4_2, 'home');
    const lines = getLines(home);
    expect(lines.defense).toBeLessThan(lines.midfield);
    expect(lines.midfield).toBeLessThan(lines.attack);
  });

  it('4-4-2 Heim: exakte Mittelwerte', () => {
    const home = teamFromFormation(FORMATION_4_4_2, 'home');
    const lines = getLines(home);
    expect(lines.defense).toBeCloseTo((22 + 20 + 20 + 22) / 4, 5);
    expect(lines.midfield).toBeCloseTo((50 + 48 + 48 + 50) / 4, 5);
    expect(lines.attack).toBeCloseTo((72 + 72) / 2, 5);
  });

  it('Auswärts-Team (gespiegelt): Linien sind 100 − Heim-Linien', () => {
    const home = teamFromFormation(FORMATION_4_3_3, 'home');
    const away = teamFromFormation(FORMATION_4_3_3, 'away');
    const h = getLines(home);
    const a = getLines(away);
    expect(a.defense).toBeCloseTo(100 - h.defense, 5);
    expect(a.midfield).toBeCloseTo(100 - h.midfield, 5);
    expect(a.attack).toBeCloseTo(100 - h.attack, 5);
  });
});
