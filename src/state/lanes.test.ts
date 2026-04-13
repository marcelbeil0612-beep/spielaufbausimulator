import { describe, it, expect } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import {
  createInitialLanesState,
  lanesReducer,
} from './lanes';

describe('lanesReducer', () => {
  it('createInitialLanesState liefert genau eine Lane', () => {
    const state = createInitialLanesState();
    expect(state.lanes).toHaveLength(1);
    expect(state.activeLaneId).toBe(state.lanes[0]!.id);
  });

  it('setActiveLane auf existierende Lane setzt aktiven Fokus', () => {
    const state = createInitialLanesState();
    const added = lanesReducer(state, { type: 'addLane' });
    expect(added.activeLaneId).toBe(added.lanes[1]!.id);
    const back = lanesReducer(added, {
      type: 'setActiveLane',
      laneId: added.lanes[0]!.id,
    });
    expect(back.activeLaneId).toBe(added.lanes[0]!.id);
  });

  it('setActiveLane auf unbekannte Lane ist No-Op (Referenz-Identität)', () => {
    const state = createInitialLanesState();
    const next = lanesReducer(state, {
      type: 'setActiveLane',
      laneId: 'lane-999',
    });
    expect(next).toBe(state);
  });

  it('addLane klont die aktive Lane als Quelle (per Default)', () => {
    const state = createInitialLanesState(createInitialScene('wide'));
    const next = lanesReducer(state, { type: 'addLane' });
    expect(next.lanes).toHaveLength(2);
    expect(next.lanes[1]!.scene.variant).toBe('wide');
    expect(next.lanes[1]!.id).not.toBe(next.lanes[0]!.id);
  });

  it('addLane mit sourceLaneId klont die spezifizierte Lane', () => {
    let state = createInitialLanesState(createInitialScene('narrow'));
    state = lanesReducer(state, { type: 'addLane' });
    // zweite Lane auf switch setzen
    state = lanesReducer(state, {
      type: 'lane',
      laneId: state.lanes[1]!.id,
      action: { type: 'setVariant', variant: 'switch' },
    });
    const added = lanesReducer(state, {
      type: 'addLane',
      sourceLaneId: state.lanes[1]!.id,
    });
    expect(added.lanes[2]!.scene.variant).toBe('switch');
  });

  it('removeLane entfernt nur, wenn mehr als eine Lane vorhanden ist', () => {
    const state = createInitialLanesState();
    const noop = lanesReducer(state, {
      type: 'removeLane',
      laneId: state.lanes[0]!.id,
    });
    expect(noop).toBe(state);
  });

  it('removeLane setzt neuen activeLaneId auf linken Nachbarn', () => {
    let state = createInitialLanesState();
    state = lanesReducer(state, { type: 'addLane' });
    state = lanesReducer(state, { type: 'addLane' });
    // [lane-1, lane-2, lane-3], activeLaneId = lane-3
    expect(state.activeLaneId).toBe('lane-3');
    const next = lanesReducer(state, { type: 'removeLane', laneId: 'lane-3' });
    expect(next.lanes.map((l) => l.id)).toEqual(['lane-1', 'lane-2']);
    expect(next.activeLaneId).toBe('lane-2');
  });

  it('lane-Action dispatched nur auf die benannte Lane', () => {
    let state = createInitialLanesState();
    state = lanesReducer(state, { type: 'addLane' });
    const nextState = lanesReducer(state, {
      type: 'lane',
      laneId: state.lanes[0]!.id,
      action: { type: 'setVariant', variant: 'wide' },
    });
    expect(nextState.lanes[0]!.scene.variant).toBe('wide');
    expect(nextState.lanes[1]!.scene.variant).toBe('narrow');
  });

  it('lane-Action auf unbekannte Lane ist No-Op', () => {
    const state = createInitialLanesState();
    const next = lanesReducer(state, {
      type: 'lane',
      laneId: 'lane-999',
      action: { type: 'reset' },
    });
    expect(next).toBe(state);
  });

  it('broadcast dispatched die Action an alle Lanes', () => {
    let state = createInitialLanesState();
    state = lanesReducer(state, { type: 'addLane' });
    const next = lanesReducer(state, {
      type: 'broadcast',
      action: { type: 'setVariant', variant: 'switch' },
    });
    expect(next.lanes[0]!.scene.variant).toBe('switch');
    expect(next.lanes[1]!.scene.variant).toBe('switch');
  });

  it('broadcast ohne effektive Änderung liefert Referenz-Identität zurück', () => {
    const state = createInitialLanesState();
    const next = lanesReducer(state, {
      type: 'broadcast',
      action: { type: 'advanceTime', dt: 0.1 },
    });
    expect(next).toBe(state);
  });

  it('neue Lanes bekommen fortlaufende IDs ohne Kollision', () => {
    let state = createInitialLanesState();
    state = lanesReducer(state, { type: 'addLane' });
    state = lanesReducer(state, { type: 'addLane' });
    state = lanesReducer(state, {
      type: 'removeLane',
      laneId: state.lanes[1]!.id,
    });
    state = lanesReducer(state, { type: 'addLane' });
    const ids = state.lanes.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
