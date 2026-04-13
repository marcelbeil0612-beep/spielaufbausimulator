import { describe, it, expect } from 'vitest';
import { FORMATION_4_4_2, FORMATION_4_3_3 } from '@/domain/formations';
import { teamFromFormation } from '@/domain/team';
import { getLines } from '@/domain/lines';
import { linesBroken } from './linesBroken';

describe('linesBroken (home attackingSide)', () => {
  const away = teamFromFormation(FORMATION_4_4_2, 'away');
  const opp = getLines(away);

  it('Pass GK (y=6) → ST-Raum (y=82) überspielt alle 3 Linien', () => {
    expect(linesBroken(6, 82, opp, 'home')).toBe(3);
  });

  it('Pass GK (y=6) → LIV (y=18) überspielt keine Linie (vor Angriffslinie)', () => {
    // away.attack = 100 - 72 = 28. 18 < 28 → 0 Linien.
    expect(linesBroken(6, 18, opp, 'home')).toBe(0);
  });

  it('Pass GK (y=6) → hinter Angriffslinie (y=30) überspielt 1 Linie', () => {
    expect(linesBroken(6, 30, opp, 'home')).toBe(1);
  });

  it('Rückpass (toY < fromY) überspielt 0 Linien', () => {
    expect(linesBroken(50, 20, opp, 'home')).toBe(0);
  });

  it('toY = fromY überspielt 0 Linien', () => {
    expect(linesBroken(40, 40, opp, 'home')).toBe(0);
  });
});

describe('linesBroken (away attackingSide)', () => {
  const home = teamFromFormation(FORMATION_4_3_3, 'home');
  const opp = getLines(home);

  it('Pass GK (y=94) → ST-Raum (y=18) überspielt alle 3 Linien', () => {
    expect(linesBroken(94, 18, opp, 'away')).toBe(3);
  });

  it('Rückpass (toY > fromY) überspielt 0 Linien', () => {
    expect(linesBroken(30, 60, opp, 'away')).toBe(0);
  });
});
