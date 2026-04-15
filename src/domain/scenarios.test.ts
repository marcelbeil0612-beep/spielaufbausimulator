import { describe, it, expect } from 'vitest';
import { SCENARIOS, findScenario } from './scenarios';

describe('scenarios', () => {
  it('jedes Szenario hat eine eindeutige id', () => {
    const ids = new Set(SCENARIOS.map((s) => s.id));
    expect(ids.size).toBe(SCENARIOS.length);
  });

  it('jedes Szenario baut eine gültige Szene', () => {
    for (const scenario of SCENARIOS) {
      const scene = scenario.build();
      expect(scene.home.players.length).toBeGreaterThan(0);
      expect(scene.away.players.length).toBeGreaterThan(0);
      expect(scene.ballHolderId).toBeTruthy();
      expect(scene.history).toEqual([]);
    }
  });

  it('findScenario liefert null für unbekannte id', () => {
    expect(findScenario('does-not-exist')).toBeUndefined();
  });

  it('Aufbau gegen tiefes Pressing setzt 5-3-2 und low press', () => {
    const scenario = findScenario('build-up-low-block')!;
    expect(scenario.build().pressIntensity).toBe('low');
    expect(scenario.build().away.formation).toBe('5-3-2');
  });

  it('Sechser unter Druck setzt den Ballhalter auf die 6', () => {
    const scenario = findScenario('six-under-pressure')!;
    const scene = scenario.build();
    const holder = scene.home.players.find((p) => p.id === scene.ballHolderId);
    expect(holder?.role).toBe('CDM');
    expect(scene.ballPos).toEqual(holder?.position);
  });

  it('Offene Verlagerung überschreibt beide gegnerischen Stürmer separat', () => {
    const scenario = findScenario('open-switch')!;
    const scene = scenario.build();
    const strikers = scene.away.players.filter((p) => p.role === 'ST');
    expect(strikers).toHaveLength(2);
    expect(strikers[0]?.position).toEqual({ x: 38, y: 30 });
    expect(strikers[1]?.position).toEqual({ x: 48, y: 32 });
  });
});
