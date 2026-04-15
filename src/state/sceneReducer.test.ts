import { describe, it, expect } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import { HISTORY_MAX, sceneReducer } from './sceneReducer';

describe('sceneReducer', () => {
  it('pass-Aktion ändert den Ballträger', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    const next = sceneReducer(start, { type: 'pass', targetId: liv.id });
    expect(next.ballHolderId).toBe(liv.id);
  });

  it('pass-Aktion startet einen Ballflug, ohne Gegner-Positionen sofort zu verändern', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    const next = sceneReducer(start, { type: 'pass', targetId: liv.id });
    expect(next.ballFlight).not.toBeNull();
    expect(next.ballFlight?.toId).toBe(liv.id);
    expect(next.away.players).toEqual(start.away.players);
  });

  it('skipFlight schließt den Pass ab und löst die volle Reaktion aus', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const flying = sceneReducer(start, { type: 'pass', targetId: liv.id });
    const landed = sceneReducer(flying, { type: 'skipFlight' });
    expect(landed.ballFlight).toBeNull();
    expect(landed.ballPos).toEqual(liv.position);
    expect(landed.away.players).not.toEqual(start.away.players);
  });

  it('advanceTime bewegt den Flug schrittweise voran', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const flying = sceneReducer(start, { type: 'pass', targetId: liv.id });
    const half = sceneReducer(flying, {
      type: 'advanceTime',
      dt: flying.ballFlight!.duration / 2,
    });
    expect(half.ballFlight).not.toBeNull();
    expect(half.ballFlight!.elapsed).toBeCloseTo(
      flying.ballFlight!.duration / 2,
      5,
    );
    expect(half.away.players).not.toEqual(start.away.players);
  });

  it('gegnerische Feldspieler frieren nach Passankunft ein', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const flying = sceneReducer(start, { type: 'pass', targetId: liv.id });
    const landed = sceneReducer(flying, { type: 'skipFlight' });
    const frozen = sceneReducer(landed, { type: 'advanceTime', dt: 0.5 });
    expect(landed.ballFlight).toBeNull();
    expect(frozen).toBe(landed);
  });

  it('advanceTime über die Dauer hinaus schließt den Flug ab', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const flying = sceneReducer(start, { type: 'pass', targetId: liv.id });
    const after = sceneReducer(flying, { type: 'advanceTime', dt: 10 });
    expect(after.ballFlight).toBeNull();
    expect(after.ballPos).toEqual(liv.position);
  });

  it('dirty first touch hält nach Passankunft ein kurzes Nachschiebe-Fenster offen', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const clean = sceneReducer(start, {
      type: 'pass',
      targetId: liv.id,
      firstTouch: 'clean',
    });
    const dirty = sceneReducer(start, {
      type: 'pass',
      targetId: liv.id,
      firstTouch: 'dirty',
    });
    const cleanAtArrival = sceneReducer(clean, {
      type: 'advanceTime',
      dt: clean.ballFlight!.travelDuration,
    });
    const dirtyAtArrival = sceneReducer(dirty, {
      type: 'advanceTime',
      dt: dirty.ballFlight!.travelDuration,
    });
    expect(cleanAtArrival.ballFlight).toBeNull();
    expect(dirtyAtArrival.ballFlight).not.toBeNull();
    expect(dirtyAtArrival.ballPos).toEqual(liv.position);
  });

  it('dirty first touch bekommt mehr Zusatzdauer als neutral oder clean', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const clean = sceneReducer(start, {
      type: 'pass',
      targetId: liv.id,
      firstTouch: 'clean',
    });
    const neutral = sceneReducer(start, {
      type: 'pass',
      targetId: liv.id,
      firstTouch: 'neutral',
    });
    const dirty = sceneReducer(start, {
      type: 'pass',
      targetId: liv.id,
      firstTouch: 'dirty',
    });
    expect(clean.ballFlight!.receptionWindowDuration).toBe(0);
    expect(neutral.ballFlight!.receptionWindowDuration).toBeGreaterThan(0);
    expect(dirty.ballFlight!.receptionWindowDuration).toBeGreaterThan(
      neutral.ballFlight!.receptionWindowDuration,
    );
  });

  it('seekFlight scrubbt proportional zur Flugdauer', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const flying = sceneReducer(start, { type: 'pass', targetId: liv.id });
    const quarter = sceneReducer(flying, { type: 'seekFlight', progress: 0.25 });
    expect(quarter.ballFlight!.elapsed).toBeCloseTo(
      flying.ballFlight!.duration * 0.25,
      5,
    );
    const ended = sceneReducer(flying, { type: 'seekFlight', progress: 1 });
    expect(ended.ballFlight).toBeNull();
  });

  it('advanceTime ohne laufenden Flug ist ein No-op', () => {
    const start = createInitialScene();
    const next = sceneReducer(start, { type: 'advanceTime', dt: 0.5 });
    expect(next).toBe(start);
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
    const landed = sceneReducer(passed, { type: 'skipFlight' });
    const resetScene = sceneReducer(landed, { type: 'reset' });
    expect(resetScene.ballHolderId).toBe(start.ballHolderId);
    expect(resetScene.away.players).toEqual(start.away.players);
    expect(resetScene.lastPass).toBeNull();
    expect(resetScene.lastReception).toBeNull();
    expect(resetScene.lastPassLane).toBeNull();
  });

  it('setVariant wechselt die Startvariante und setzt die Szene zurück', () => {
    const start = createInitialScene('narrow');
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const afterPass = sceneReducer(start, { type: 'pass', targetId: liv.id });
    const landed = sceneReducer(afterPass, { type: 'skipFlight' });
    const wide = sceneReducer(landed, { type: 'setVariant', variant: 'wide' });
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

  it('setStancePlan aktualisiert die geplante Körperstellung', () => {
    const start = createInitialScene();
    const open = sceneReducer(start, { type: 'setStancePlan', stance: 'open' });
    expect(open.stancePlan).toBe('open');
  });

  it('setStancePlan auf gleichen Wert ist No-op', () => {
    const start = createInitialScene();
    const same = sceneReducer(start, {
      type: 'setStancePlan',
      stance: start.stancePlan,
    });
    expect(same).toBe(start);
  });

  it('pass übernimmt stancePlan aus dem State', () => {
    const withPlan = sceneReducer(createInitialScene(), {
      type: 'setStancePlan',
      stance: 'open',
    });
    const liv = withPlan.home.players.find((p) => p.role === 'LCB')!;
    const next = sceneReducer(withPlan, { type: 'pass', targetId: liv.id });
    expect(next.lastReception?.stance).toBe('open');
  });

  it('reset und setVariant behalten den stancePlan', () => {
    const withPlan = sceneReducer(createInitialScene(), {
      type: 'setStancePlan',
      stance: 'open',
    });
    const reset = sceneReducer(withPlan, { type: 'reset' });
    expect(reset.stancePlan).toBe('open');
    const wide = sceneReducer(withPlan, {
      type: 'setVariant',
      variant: 'wide',
    });
    expect(wide.stancePlan).toBe('open');
  });

  it('setPressIntensity aktualisiert die Presshöhe', () => {
    const start = createInitialScene();
    const mid = sceneReducer(start, {
      type: 'setPressIntensity',
      pressIntensity: 'mid',
    });
    expect(mid.pressIntensity).toBe('mid');
  });

  it('setPressIntensity auf gleichen Wert ist No-op', () => {
    const start = createInitialScene();
    const next = sceneReducer(start, {
      type: 'setPressIntensity',
      pressIntensity: start.pressIntensity,
    });
    expect(next).toBe(start);
  });

  it('reset und setVariant behalten die pressIntensity', () => {
    const low = sceneReducer(createInitialScene(), {
      type: 'setPressIntensity',
      pressIntensity: 'low',
    });
    const reset = sceneReducer(low, { type: 'reset' });
    expect(reset.pressIntensity).toBe('low');
    const wide = sceneReducer(low, { type: 'setVariant', variant: 'wide' });
    expect(wide.pressIntensity).toBe('low');
  });

  it('pass legt einen Pre-Snapshot in history ab', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    expect(start.history).toEqual([]);
    const next = sceneReducer(start, { type: 'pass', targetId: liv.id });
    expect(next.history).toHaveLength(1);
    expect(next.history[0]!.ballHolderId).toBe(start.ballHolderId);
  });

  it('undo stellt den Zustand vor dem letzten Pass wieder her', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const after = sceneReducer(start, { type: 'pass', targetId: liv.id });
    const undone = sceneReducer(after, { type: 'undo' });
    expect(undone.ballHolderId).toBe(start.ballHolderId);
    expect(undone.ballFlight).toBeNull();
    expect(undone.history).toHaveLength(0);
  });

  it('undo nacheinander pop-t mehrere Snapshots', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const cdm = start.home.players.find((p) => p.role === 'CDM')!;
    let state = sceneReducer(start, { type: 'pass', targetId: liv.id });
    state = sceneReducer(state, { type: 'skipFlight' });
    state = sceneReducer(state, { type: 'pass', targetId: cdm.id });
    expect(state.history).toHaveLength(2);
    state = sceneReducer(state, { type: 'undo' });
    expect(state.history).toHaveLength(1);
    expect(state.ballHolderId).toBe(liv.id);
    state = sceneReducer(state, { type: 'undo' });
    expect(state.history).toHaveLength(0);
    expect(state.ballHolderId).toBe(start.ballHolderId);
  });

  it('undo ohne History ist Referenz-identischer No-Op', () => {
    const start = createInitialScene();
    const next = sceneReducer(start, { type: 'undo' });
    expect(next).toBe(start);
  });

  it('loadScenario ersetzt die Szene durch den Szenario-Build', () => {
    const start = createInitialScene();
    const next = sceneReducer(start, {
      type: 'loadScenario',
      scenarioId: 'back-five',
    });
    expect(next.away.formation).toBe('5-3-2');
  });

  it('loadScenario mit unbekannter id ist Referenz-identischer No-Op', () => {
    const start = createInitialScene();
    const next = sceneReducer(start, {
      type: 'loadScenario',
      scenarioId: 'no-such-scenario',
    });
    expect(next).toBe(start);
  });

  it('reset pusht einen Snapshot in die History (undo-bar)', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const passed = sceneReducer(start, { type: 'pass', targetId: liv.id });
    const landed = sceneReducer(passed, { type: 'skipFlight' });
    const reset = sceneReducer(landed, { type: 'reset' });
    expect(reset.history.length).toBeGreaterThan(0);
    const undone = sceneReducer(reset, { type: 'undo' });
    expect(undone.ballHolderId).toBe(landed.ballHolderId);
  });

  it('dribble-Aktion startet ein Dribbling und pusht einen Snapshot', () => {
    const start = createInitialScene();
    const holder = start.home.players.find((p) => p.id === start.ballHolderId)!;
    const target = { x: holder.position.x + 5, y: holder.position.y + 15 };
    const next = sceneReducer(start, { type: 'dribble', targetPos: target });
    expect(next.dribble).not.toBeNull();
    expect(next.dribble!.playerId).toBe(holder.id);
    expect(next.dribble!.start).toEqual(holder.position);
    expect(next.dribble!.end).toEqual(target);
    expect(next.history).toHaveLength(1);
  });

  it('dribble-Aktion ignoriert den Input bei laufendem Ballflug', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const flying = sceneReducer(start, { type: 'pass', targetId: liv.id });
    const next = sceneReducer(flying, {
      type: 'dribble',
      targetPos: { x: 50, y: 50 },
    });
    expect(next).toBe(flying);
  });

  it('advanceTime treibt ein Dribbling schrittweise voran', () => {
    const start = createInitialScene();
    const holder = start.home.players.find((p) => p.id === start.ballHolderId)!;
    const dribbling = sceneReducer(start, {
      type: 'dribble',
      targetPos: { x: holder.position.x, y: holder.position.y + 20 },
    });
    const half = sceneReducer(dribbling, {
      type: 'advanceTime',
      dt: dribbling.dribble!.duration / 2,
    });
    expect(half.dribble).not.toBeNull();
    expect(half.dribble!.elapsed).toBeCloseTo(
      dribbling.dribble!.duration / 2,
      5,
    );
    const midY = (holder.position.y + holder.position.y + 20) / 2;
    expect(half.ballPos.y).toBeCloseTo(midY, 1);
  });

  it('skipFlight schließt auch ein Dribbling ab und setzt den Ballhalter auf das Ziel', () => {
    const start = createInitialScene();
    const holder = start.home.players.find((p) => p.id === start.ballHolderId)!;
    const target = { x: holder.position.x + 2, y: holder.position.y + 25 };
    const dribbling = sceneReducer(start, {
      type: 'dribble',
      targetPos: target,
    });
    const done = sceneReducer(dribbling, { type: 'skipFlight' });
    expect(done.dribble).toBeNull();
    const finalHolder = done.home.players.find((p) => p.id === holder.id)!;
    expect(finalHolder.position.x).toBeCloseTo(target.x, 5);
    expect(finalHolder.position.y).toBeCloseTo(target.y, 5);
  });

  it('movePlayer setzt einen Heimspieler auf die Zielposition und pusht Snapshot', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const target = { x: liv.position.x + 8, y: liv.position.y + 4 };
    const next = sceneReducer(start, {
      type: 'movePlayer',
      playerId: liv.id,
      position: target,
    });
    const moved = next.home.players.find((p) => p.id === liv.id)!;
    expect(moved.position).toEqual(target);
    expect(next.history).toHaveLength(1);
  });

  it('movePlayer am Ballhalter zieht den Ball mit', () => {
    const start = createInitialScene();
    const holder = start.home.players.find((p) => p.id === start.ballHolderId)!;
    const target = { x: holder.position.x + 5, y: holder.position.y + 5 };
    const next = sceneReducer(start, {
      type: 'movePlayer',
      playerId: holder.id,
      position: target,
    });
    expect(next.ballPos).toEqual(target);
  });

  it('movePlayer verschiebt auch Auswärtsspieler', () => {
    const start = createInitialScene();
    const awayPlayer = start.away.players[0]!;
    const target = { x: awayPlayer.position.x + 3, y: awayPlayer.position.y - 4 };
    const next = sceneReducer(start, {
      type: 'movePlayer',
      playerId: awayPlayer.id,
      position: target,
    });
    const moved = next.away.players.find((p) => p.id === awayPlayer.id)!;
    expect(moved.position).toEqual(target);
    expect(next.home.players).toEqual(start.home.players);
  });

  it('movePlayer mit identischer Position ist Referenz-identischer No-Op', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const next = sceneReducer(start, {
      type: 'movePlayer',
      playerId: liv.id,
      position: liv.position,
    });
    expect(next).toBe(start);
  });

  it('movePlayer ist während laufender Animation unwirksam', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const flying = sceneReducer(start, { type: 'pass', targetId: liv.id });
    const next = sceneReducer(flying, {
      type: 'movePlayer',
      playerId: liv.id,
      position: { x: 50, y: 50 },
    });
    expect(next).toBe(flying);
  });

  it('movePlayer clamped die Position aufs Feld', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const next = sceneReducer(start, {
      type: 'movePlayer',
      playerId: liv.id,
      position: { x: 150, y: -20 },
    });
    const moved = next.home.players.find((p) => p.id === liv.id)!;
    expect(moved.position).toEqual({ x: 100, y: 0 });
  });

  it('undo stellt den Zustand vor einem Dribbling wieder her', () => {
    const start = createInitialScene();
    const holder = start.home.players.find((p) => p.id === start.ballHolderId)!;
    const dribbling = sceneReducer(start, {
      type: 'dribble',
      targetPos: { x: holder.position.x + 3, y: holder.position.y + 15 },
    });
    const undone = sceneReducer(dribbling, { type: 'undo' });
    expect(undone.dribble).toBeNull();
    expect(undone.ballHolderId).toBe(start.ballHolderId);
    expect(undone.history).toHaveLength(0);
  });

  describe('History-Cap', () => {
    it('history wächst nicht über HISTORY_MAX hinaus', () => {
      let scene = createInitialScene();
      for (let i = 0; i < HISTORY_MAX + 10; i++) {
        scene = sceneReducer(scene, {
          type: 'setPressIntensity',
          pressIntensity: i % 2 === 0 ? 'low' : 'high',
        });
      }
      expect(scene.history.length).toBe(HISTORY_MAX);
    });
  });

  describe('Animations-Guards', () => {
    it('pass während eines laufenden Flugs ist ein No-op', () => {
      const start = createInitialScene();
      const liv = start.home.players.find((p) => p.role === 'LCB')!;
      const riv = start.home.players.find((p) => p.role === 'RCB')!;
      const flying = sceneReducer(start, { type: 'pass', targetId: liv.id });
      const attempted = sceneReducer(flying, { type: 'pass', targetId: riv.id });
      expect(attempted).toBe(flying);
    });

    it('reset während eines laufenden Flugs ist ein No-op', () => {
      const start = createInitialScene();
      const liv = start.home.players.find((p) => p.role === 'LCB')!;
      const flying = sceneReducer(start, { type: 'pass', targetId: liv.id });
      const attempted = sceneReducer(flying, { type: 'reset' });
      expect(attempted).toBe(flying);
    });

    it('loadScenario während eines laufenden Flugs ist ein No-op', () => {
      const start = createInitialScene();
      const liv = start.home.players.find((p) => p.role === 'LCB')!;
      const flying = sceneReducer(start, { type: 'pass', targetId: liv.id });
      const attempted = sceneReducer(flying, {
        type: 'loadScenario',
        scenarioId: 'low-block',
      });
      expect(attempted).toBe(flying);
    });

    it('setVariant während eines laufenden Flugs ist ein No-op', () => {
      const start = createInitialScene('narrow');
      const liv = start.home.players.find((p) => p.role === 'LCB')!;
      const flying = sceneReducer(start, { type: 'pass', targetId: liv.id });
      const attempted = sceneReducer(flying, {
        type: 'setVariant',
        variant: 'wide',
      });
      expect(attempted).toBe(flying);
    });

    it('setAwayFormation während eines laufenden Flugs ist ein No-op', () => {
      const start = createInitialScene();
      const liv = start.home.players.find((p) => p.role === 'LCB')!;
      const flying = sceneReducer(start, { type: 'pass', targetId: liv.id });
      const attempted = sceneReducer(flying, {
        type: 'setAwayFormation',
        awayFormation: '5-3-2',
      });
      expect(attempted).toBe(flying);
    });
  });

  describe('Undo-Semantik für Picker- und Kontroll-Actions', () => {
    it('setPressIntensity ist per Undo rückgängig zu machen', () => {
      const start = createInitialScene();
      const changed = sceneReducer(start, {
        type: 'setPressIntensity',
        pressIntensity: 'low',
      });
      expect(changed.pressIntensity).toBe('low');
      const undone = sceneReducer(changed, { type: 'undo' });
      expect(undone.pressIntensity).toBe(start.pressIntensity);
    });

    it('setVariant ist per Undo rückgängig zu machen', () => {
      const start = createInitialScene('narrow');
      const changed = sceneReducer(start, {
        type: 'setVariant',
        variant: 'wide',
      });
      const undone = sceneReducer(changed, { type: 'undo' });
      expect(undone.variant).toBe('narrow');
    });

    it('loadScenario ist per Undo rückgängig zu machen', () => {
      const start = createInitialScene();
      const loaded = sceneReducer(start, {
        type: 'loadScenario',
        scenarioId: 'back-five',
      });
      expect(loaded.away.formation).toBe('5-3-2');
      const undone = sceneReducer(loaded, { type: 'undo' });
      expect(undone.away.formation).toBe(start.away.formation);
    });

    it('setFirstTouchPlan / setStancePlan pushen History', () => {
      let scene = createInitialScene();
      scene = sceneReducer(scene, {
        type: 'setFirstTouchPlan',
        firstTouch: 'dirty',
      });
      scene = sceneReducer(scene, {
        type: 'setStancePlan',
        stance: 'open',
      });
      expect(scene.history).toHaveLength(2);
    });
  });

  describe('lastPassLane', () => {
    it('wird beim Pass geometrisch gesetzt', () => {
      const start = createInitialScene();
      const liv = start.home.players.find((p) => p.role === 'LCB')!;
      const passed = sceneReducer(start, { type: 'pass', targetId: liv.id });
      expect(passed.lastPassLane).not.toBeNull();
      expect(passed.lastPassLane!.closest).toBeGreaterThan(0);
    });

    it('bleibt nach skipFlight erhalten (Live-Rating-Konsistenz)', () => {
      const start = createInitialScene();
      const liv = start.home.players.find((p) => p.role === 'LCB')!;
      const passed = sceneReducer(start, { type: 'pass', targetId: liv.id });
      const landed = sceneReducer(passed, { type: 'skipFlight' });
      expect(landed.lastPassLane).toEqual(passed.lastPassLane);
    });

    it('ist nach reset wieder null', () => {
      const start = createInitialScene();
      const liv = start.home.players.find((p) => p.role === 'LCB')!;
      const passed = sceneReducer(start, { type: 'pass', targetId: liv.id });
      const landed = sceneReducer(passed, { type: 'skipFlight' });
      expect(landed.lastPassLane).not.toBeNull();
      const reset = sceneReducer(landed, { type: 'reset' });
      expect(reset.lastPassLane).toBeNull();
    });
  });
});
