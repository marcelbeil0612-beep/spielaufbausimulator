import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import { loadScene, saveScene, STORAGE_KEY } from './persistence';

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
});
