import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import { STORAGE_KEY } from './persistence';
import { createInitialLanesState, lanesReducer } from './lanes';
import {
  LANES_STORAGE_KEY,
  loadLanes,
  saveLanes,
} from './lanesPersistence';

function freshStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    key(index) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key) {
      map.delete(key);
    },
    setItem(key, value) {
      map.set(key, value);
    },
  };
}

describe('lanesPersistence', () => {
  let storage: Storage;
  beforeEach(() => {
    storage = freshStorage();
  });

  it('leerer Storage → Initial-Lanes mit einer Lane', () => {
    const state = loadLanes(storage);
    expect(state.lanes).toHaveLength(1);
  });

  it('save + load round-trippt den State', () => {
    let original = createInitialLanesState(createInitialScene('wide'));
    original = lanesReducer(original, { type: 'addLane' });
    saveLanes(original, storage);
    const loaded = loadLanes(storage);
    expect(loaded.lanes).toHaveLength(2);
    expect(loaded.lanes[0]!.scene.variant).toBe('wide');
    expect(loaded.activeLaneId).toBe(original.activeLaneId);
  });

  it('kaputt serialisierter v4-Wert → Fallback auf v3 oder Initial', () => {
    storage.setItem(LANES_STORAGE_KEY, '{not json');
    const loaded = loadLanes(storage);
    expect(loaded.lanes).toHaveLength(1);
  });

  it('strukturell invalider v4-Wert → Fallback', () => {
    storage.setItem(LANES_STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    const loaded = loadLanes(storage);
    expect(loaded.lanes).toHaveLength(1);
  });

  it('ohne v4 wird die v3-Einzel-Szene in eine Lane eingewickelt', () => {
    const v3 = createInitialScene('switch');
    storage.setItem(STORAGE_KEY, JSON.stringify(v3));
    const loaded = loadLanes(storage);
    expect(loaded.lanes).toHaveLength(1);
    expect(loaded.lanes[0]!.scene.variant).toBe('switch');
  });

  it('activeLaneId muss auf eine vorhandene Lane zeigen, sonst Fallback', () => {
    const bad = {
      activeLaneId: 'phantom',
      lanes: [{ id: 'lane-1', scene: createInitialScene() }],
    };
    storage.setItem(LANES_STORAGE_KEY, JSON.stringify(bad));
    const loaded = loadLanes(storage);
    // Fallback: activeLaneId der Initial-Lane
    expect(loaded.lanes.find((l) => l.id === loaded.activeLaneId)).toBeDefined();
  });

  it('ohne Storage → Initial-Lanes', () => {
    const state = loadLanes(undefined);
    expect(state.lanes).toHaveLength(1);
  });

  it('saveLanes persistiert die History nicht', () => {
    const initial = createInitialLanesState(createInitialScene());
    const first = initial.lanes[0]!.scene;
    const fakeHistoryLane = {
      ...initial.lanes[0]!,
      scene: { ...first, history: [first] },
    };
    const withHistory = { ...initial, lanes: [fakeHistoryLane] };
    saveLanes(withHistory, storage);
    const raw = storage.getItem(LANES_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.lanes[0].scene.history).toEqual([]);
  });
});
