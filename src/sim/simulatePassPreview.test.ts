import { describe, it, expect } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import { simulatePassPreview } from './simulatePassPreview';

describe('simulatePassPreview', () => {
  it('liefert für alle 11 Heimspieler in der Startszene eine gültige Bewertung', () => {
    const scene = createInitialScene();
    const validRatings = ['open', 'pressure', 'risky', 'loss-danger'] as const;
    for (const p of scene.home.players) {
      const rating = simulatePassPreview(scene, p.id);
      expect(validRatings).toContain(rating);
    }
  });

  it('Pass auf LIV in der Startszene führt zur Bewertung pressure', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    expect(simulatePassPreview(scene, liv.id)).toBe('pressure');
  });

  it('ungültige targetId → Bewertung entspricht der aktuellen Szene', () => {
    const scene = createInitialScene();
    expect(simulatePassPreview(scene, 'nope')).toBe('open');
  });

  it('Pass auf aktuellen Ballträger → Bewertung entspricht der aktuellen Szene', () => {
    const scene = createInitialScene();
    expect(simulatePassPreview(scene, scene.ballHolderId)).toBe('open');
  });

  it('mutiert die Eingabe-Szene nicht', () => {
    const scene = createInitialScene();
    const snapshot = JSON.stringify(scene);
    const liv = scene.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    simulatePassPreview(scene, liv.id);
    expect(JSON.stringify(scene)).toBe(snapshot);
  });

  it('firstTouchPlan im Scene wirkt auf die Preview-Bewertung', () => {
    const baseScene = createInitialScene();
    const dirtyScene = { ...baseScene, firstTouchPlan: 'dirty' as const };
    const liv = baseScene.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    const baseline = simulatePassPreview(baseScene, liv.id);
    const dirty = simulatePassPreview(dirtyScene, liv.id);
    // Baseline ist pressure. Mit dirty first touch mindestens risky.
    expect(baseline).toBe('pressure');
    expect(['risky', 'loss-danger']).toContain(dirty);
  });

  it('options.firstTouch übersteuert scene.firstTouchPlan', () => {
    const scene = { ...createInitialScene(), firstTouchPlan: 'dirty' as const };
    const liv = scene.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    const withClean = simulatePassPreview(scene, liv.id, { firstTouch: 'clean' });
    // Mit clean first touch fällt dirty-Effekt weg, Baseline bleibt pressure.
    expect(withClean).toBe('pressure');
  });

  it('scene.passPlan.accuracy wirkt auf die Preview-Bewertung', () => {
    const scene = {
      ...createInitialScene(),
      passPlan: { velocity: 'normal', accuracy: 'imprecise' } as const,
    };
    const rb = scene.home.players.find((p) => p.role === 'RB');
    if (!rb) throw new Error('RB fehlt');
    expect(simulatePassPreview(scene, rb.id)).not.toBe('open');
  });

  it('ungenauer Pass hebt Bewertung von open auf risky', () => {
    const scene = createInitialScene();
    // Pass aufs eigene Tor (ballHolder) → fallback auf current. Wähle TW als Ziel
    // ist kein gültiger Zielwechsel, deshalb nutzen wir hier einen weit entfernten
    // Spieler, dessen Preview ohne Accuracy-Override 'open' wäre.
    const rb = scene.home.players.find((p) => p.role === 'RB');
    if (!rb) throw new Error('RB fehlt');
    const baseline = simulatePassPreview(scene, rb.id);
    const withImprecise = simulatePassPreview(scene, rb.id, {
      accuracy: 'imprecise',
    });
    if (baseline === 'open') {
      expect(withImprecise).toBe('risky');
    } else {
      // Falls RB in Startszene schon pressure/risky ist, sollte imprecise
      // die Stufe mindestens beibehalten.
      expect(withImprecise).not.toBe('open');
    }
  });
});
