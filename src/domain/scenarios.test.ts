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

  it('tief-stehender-Gegner setzt pressIntensity auf low', () => {
    const scenario = findScenario('low-block')!;
    expect(scenario.build().pressIntensity).toBe('low');
  });

  it('Dreierketten-Szenario setzt awayFormation 5-3-2', () => {
    const scenario = findScenario('back-five')!;
    expect(scenario.build().away.formation).toBe('5-3-2');
  });
});
