import { describe, it, expect } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import { sceneReducer } from './sceneReducer';

describe('sceneReducer', () => {
  it('pass-Aktion ändert den Ballträger', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    const next = sceneReducer(start, { type: 'pass', targetId: liv.id });
    expect(next.ballHolderId).toBe(liv.id);
  });

  it('pass-Aktion löst Reaktion aus (Gegner-Stürmer bewegt sich)', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    const next = sceneReducer(start, { type: 'pass', targetId: liv.id });
    expect(next.away.players).not.toEqual(start.away.players);
  });

  it('ungültige targetId → unveränderter State', () => {
    const start = createInitialScene();
    const next = sceneReducer(start, { type: 'pass', targetId: 'nope' });
    expect(next).toBe(start);
  });

  it('Pass auf aktuellen Ballträger ändert nichts', () => {
    const start = createInitialScene();
    const next = sceneReducer(start, { type: 'pass', targetId: start.ballHolderId });
    expect(next).toBe(start);
  });

  it('pass ohne Optionen setzt Default-PassOptions (normal/neutral)', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    const next = sceneReducer(start, { type: 'pass', targetId: liv.id });
    expect(next.lastPass).toEqual({ velocity: 'normal', accuracy: 'neutral' });
  });

  it('pass übernimmt velocity und accuracy aus der Action', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    const next = sceneReducer(start, {
      type: 'pass',
      targetId: liv.id,
      velocity: 'sharp',
      accuracy: 'imprecise',
    });
    expect(next.lastPass).toEqual({ velocity: 'sharp', accuracy: 'imprecise' });
  });

  it('pass setzt lastReception auf Default (neutral/closed)', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    const next = sceneReducer(start, { type: 'pass', targetId: liv.id });
    expect(next.lastReception).toEqual({
      firstTouch: 'neutral',
      stance: 'closed',
    });
  });

  it('pass übernimmt firstTouch und stance aus der Action', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    const next = sceneReducer(start, {
      type: 'pass',
      targetId: liv.id,
      firstTouch: 'dirty',
      stance: 'open',
    });
    expect(next.lastReception).toEqual({ firstTouch: 'dirty', stance: 'open' });
  });

  it('reset-Aktion stellt die Initialszene wieder her und räumt lastPass/lastReception', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    const passed = sceneReducer(start, { type: 'pass', targetId: liv.id });
    const resetScene = sceneReducer(passed, { type: 'reset' });
    expect(resetScene.ballHolderId).toBe(start.ballHolderId);
    expect(resetScene.away.players).toEqual(start.away.players);
    expect(resetScene.lastPass).toBeNull();
    expect(resetScene.lastReception).toBeNull();
  });

  it('setVariant wechselt die Startvariante und setzt die Szene zurück', () => {
    const start = createInitialScene('narrow');
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const afterPass = sceneReducer(start, { type: 'pass', targetId: liv.id });
    const wide = sceneReducer(afterPass, { type: 'setVariant', variant: 'wide' });
    expect(wide.variant).toBe('wide');
    expect(wide.ballHolderId).toBe(createInitialScene('wide').ballHolderId);
    const livWide = wide.home.players.find((p) => p.role === 'LCB')!;
    expect(livWide.position.x).toBe(22);
  });

  it('setVariant auf die bereits aktive Variante ist ein No-op', () => {
    const start = createInitialScene('wide');
    const next = sceneReducer(start, { type: 'setVariant', variant: 'wide' });
    expect(next).toBe(start);
  });

  it('reset behält die aktuelle Variante', () => {
    const start = createInitialScene('wide');
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const afterPass = sceneReducer(start, { type: 'pass', targetId: liv.id });
    const reset = sceneReducer(afterPass, { type: 'reset' });
    expect(reset.variant).toBe('wide');
    const livReset = reset.home.players.find((p) => p.role === 'LCB')!;
    expect(livReset.position.x).toBe(22);
  });

  it('setFirstTouchPlan aktualisiert den geplanten ersten Kontakt', () => {
    const start = createInitialScene();
    const next = sceneReducer(start, {
      type: 'setFirstTouchPlan',
      firstTouch: 'dirty',
    });
    expect(next.firstTouchPlan).toBe('dirty');
  });

  it('setFirstTouchPlan auf den gleichen Wert ist ein No-op', () => {
    const start = createInitialScene();
    const next = sceneReducer(start, {
      type: 'setFirstTouchPlan',
      firstTouch: start.firstTouchPlan,
    });
    expect(next).toBe(start);
  });

  it('pass übernimmt firstTouchPlan aus dem State, wenn Action nichts angibt', () => {
    const start = sceneReducer(createInitialScene(), {
      type: 'setFirstTouchPlan',
      firstTouch: 'dirty',
    });
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const next = sceneReducer(start, { type: 'pass', targetId: liv.id });
    expect(next.lastReception?.firstTouch).toBe('dirty');
  });

  it('reset behält den firstTouchPlan', () => {
    const start = sceneReducer(createInitialScene(), {
      type: 'setFirstTouchPlan',
      firstTouch: 'clean',
    });
    const reset = sceneReducer(start, { type: 'reset' });
    expect(reset.firstTouchPlan).toBe('clean');
  });

  it('setPassVelocity / setPassAccuracy aktualisieren passPlan', () => {
    const start = createInitialScene();
    const sharp = sceneReducer(start, {
      type: 'setPassVelocity',
      velocity: 'sharp',
    });
    expect(sharp.passPlan.velocity).toBe('sharp');
    const imprecise = sceneReducer(sharp, {
      type: 'setPassAccuracy',
      accuracy: 'imprecise',
    });
    expect(imprecise.passPlan).toEqual({
      velocity: 'sharp',
      accuracy: 'imprecise',
    });
  });

  it('setPassVelocity/setPassAccuracy auf gleichen Wert sind No-ops', () => {
    const start = createInitialScene();
    const v = sceneReducer(start, {
      type: 'setPassVelocity',
      velocity: start.passPlan.velocity,
    });
    const a = sceneReducer(start, {
      type: 'setPassAccuracy',
      accuracy: start.passPlan.accuracy,
    });
    expect(v).toBe(start);
    expect(a).toBe(start);
  });

  it('pass übernimmt passPlan aus dem State, wenn Action nichts angibt', () => {
    const withPlan = sceneReducer(
      sceneReducer(createInitialScene(), {
        type: 'setPassVelocity',
        velocity: 'sharp',
      }),
      { type: 'setPassAccuracy', accuracy: 'imprecise' },
    );
    const liv = withPlan.home.players.find((p) => p.role === 'LCB')!;
    const next = sceneReducer(withPlan, { type: 'pass', targetId: liv.id });
    expect(next.lastPass).toEqual({
      velocity: 'sharp',
      accuracy: 'imprecise',
    });
  });

  it('reset und setVariant behalten den passPlan', () => {
    const withPlan = sceneReducer(createInitialScene(), {
      type: 'setPassAccuracy',
      accuracy: 'imprecise',
    });
    const reset = sceneReducer(withPlan, { type: 'reset' });
    expect(reset.passPlan.accuracy).toBe('imprecise');
    const wide = sceneReducer(withPlan, {
      type: 'setVariant',
      variant: 'wide',
    });
    expect(wide.passPlan.accuracy).toBe('imprecise');
  });
});
