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

  it('high: LIV und RIV rücken auf y=30', () => {
    const adjusted = applyStartVariant(home, 'high');
    const liv = adjusted.players.find((p) => p.role === 'LCB')!;
    const riv = adjusted.players.find((p) => p.role === 'RCB')!;
    expect(liv.position.y).toBe(30);
    expect(riv.position.y).toBe(30);
  });

  it('high: X-Koordinaten der IVs bleiben wie im Default', () => {
    const defaultLiv = home.players.find((p) => p.role === 'LCB')!;
    const defaultRiv = home.players.find((p) => p.role === 'RCB')!;
    const adjusted = applyStartVariant(home, 'high');
    const liv = adjusted.players.find((p) => p.role === 'LCB')!;
    const riv = adjusted.players.find((p) => p.role === 'RCB')!;
    expect(liv.position.x).toBe(defaultLiv.position.x);
    expect(riv.position.x).toBe(defaultRiv.position.x);
  });

  it('high: Nicht-IV-Spieler bleiben unverändert', () => {
    const adjusted = applyStartVariant(home, 'high');
    const nonIV = (team: Team) =>
      team.players.filter((p) => p.role !== 'LCB' && p.role !== 'RCB');
    expect(nonIV(adjusted)).toEqual(nonIV(home));
  });
});
