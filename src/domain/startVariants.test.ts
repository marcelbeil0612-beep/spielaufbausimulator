import { describe, it, expect } from 'vitest';
import type { Team } from './types';
import { FORMATION_4_3_3 } from './formations';
import { teamFromFormation } from './team';
import { applyStartVariant } from './startVariants';

describe('applyStartVariant', () => {
  const home = teamFromFormation(FORMATION_4_3_3, 'home');

  it('narrow: LIV steht bei x=36 (Default-Formation)', () => {
    const adjusted = applyStartVariant(home, 'narrow');
    const liv = adjusted.players.find((p) => p.role === 'LCB')!;
    expect(liv.position.x).toBe(36);
  });

  it('wide: LIV rückt nach x=22', () => {
    const adjusted = applyStartVariant(home, 'wide');
    const liv = adjusted.players.find((p) => p.role === 'LCB')!;
    expect(liv.position.x).toBe(22);
  });

  it('nur LIV wird verändert', () => {
    const adjusted = applyStartVariant(home, 'wide');
    const nonLiv = (team: Team) => team.players.filter((p) => p.role !== 'LCB');
    expect(nonLiv(adjusted)).toEqual(nonLiv(home));
  });

  it('Y-Koordinate des LIV bleibt gleich', () => {
    const liv = home.players.find((p) => p.role === 'LCB')!;
    const wide = applyStartVariant(home, 'wide').players.find(
      (p) => p.role === 'LCB',
    )!;
    expect(wide.position.y).toBe(liv.position.y);
  });
});
