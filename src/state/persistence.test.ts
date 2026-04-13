import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import {
  LEGACY_STORAGE_KEY_V1,
  LEGACY_STORAGE_KEY_V2,
  loadScene,
  saveScene,
  STORAGE_KEY,
} from './persistence';

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

describe('persistence', () => {
  let storage: Storage;
  beforeEach(() => {
    storage = freshStorage();
  });

  it('loadScene ohne gespeicherten Wert liefert Initialszene', () => {
    const scene = loadScene(storage);
    expect(scene.ballHolderId).toBe(createInitialScene().ballHolderId);
  });

  it('save + load round-trippt die Szene', () => {
    const original = createInitialScene();
    saveScene(original, storage);
    const roundtripped = loadScene(storage);
    expect(roundtripped).toEqual(original);
  });

  it('kaputt serialisierter Wert → Initialszene (kein Wurf)', () => {
    storage.setItem(STORAGE_KEY, '{not json');
    const scene = loadScene(storage);
    expect(scene.ballHolderId).toBe(createInitialScene().ballHolderId);
  });

  it('strukturell falsches Objekt → Initialszene', () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    const scene = loadScene(storage);
    expect(scene.ballHolderId).toBe(createInitialScene().ballHolderId);
  });

  it('ohne Storage → Initialszene', () => {
    const scene = loadScene(undefined);
    expect(scene.ballHolderId).toBe(createInitialScene().ballHolderId);
  });

  it('alte Szene ohne pressIntensity wird auf Default migriert', () => {
    const legacy = { ...createInitialScene() } as Record<string, unknown>;
    delete legacy['pressIntensity'];
    storage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const scene = loadScene(storage);
    expect(scene.pressIntensity).toBe('high');
  });

  it('v1-Schema wird bei fehlendem v3/v2-Eintrag migriert', () => {
    const legacy = { ...createInitialScene() } as Record<string, unknown>;
    delete legacy['pressIntensity'];
    storage.setItem(LEGACY_STORAGE_KEY_V1, JSON.stringify(legacy));
    const scene = loadScene(storage);
    expect(scene.pressIntensity).toBe('high');
    expect(scene.away.formation).toBe('4-4-2');
  });

  it('v2-Schema wird bei fehlendem v3-Eintrag migriert und fehlende ballPos/ballFlight aufgefüllt', () => {
    const legacy = { ...createInitialScene() } as Record<string, unknown>;
    delete legacy['ballPos'];
    delete legacy['ballFlight'];
    storage.setItem(LEGACY_STORAGE_KEY_V2, JSON.stringify(legacy));
    const scene = loadScene(storage);
    expect(scene.ballFlight).toBeNull();
    expect(scene.ballPos).toBeDefined();
  });

  it('v3 hat Vorrang vor v2 und v1', () => {
    const v3 = createInitialScene('wide');
    const v2 = { ...createInitialScene('narrow') } as Record<string, unknown>;
    storage.setItem(STORAGE_KEY, JSON.stringify(v3));
    storage.setItem(LEGACY_STORAGE_KEY_V2, JSON.stringify(v2));
    const scene = loadScene(storage);
    expect(scene.variant).toBe('wide');
  });

  it('Szene ohne history-Feld wird mit leerer history befüllt', () => {
    const legacy = { ...createInitialScene() } as Record<string, unknown>;
    delete legacy['history'];
    storage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const scene = loadScene(storage);
    expect(scene.history).toEqual([]);
  });

  it('Szene ohne dribble-Feld wird auf null migriert', () => {
    const legacy = { ...createInitialScene() } as Record<string, unknown>;
    delete legacy['dribble'];
    storage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const scene = loadScene(storage);
    expect(scene.dribble).toBeNull();
  });
});
