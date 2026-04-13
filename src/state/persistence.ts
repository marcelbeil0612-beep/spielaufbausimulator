import type { Scene } from '@/domain/scene';
import { createInitialScene } from '@/domain/scene';
import { DEFAULT_PRESS_INTENSITY } from '@/domain/pressIntensity';

export const STORAGE_KEY = 'spielaufbau:scene:v1';

/**
 * Schreibt die Szene als JSON unter `STORAGE_KEY` in den lokalen Speicher.
 * Schlägt der Zugriff (z. B. privater Modus, kein Speicher) fehl, wird das
 * schweigend ignoriert – Persistenz ist eine Convenience, keine Kernfunktion.
 */
export function saveScene(scene: Scene, storage: Storage | undefined = safeLocalStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(scene));
  } catch {
    // ignorieren – Quota / Security-Fehler brechen die Anwendung nicht.
  }
}

/**
 * Lädt die gespeicherte Szene. Bei fehlender, fehlerhaft serialisierter oder
 * strukturell invalider Szene wird auf eine frische `createInitialScene`
 * zurückgefallen.
 */
export function loadScene(storage: Storage | undefined = safeLocalStorage()): Scene {
  if (!storage) return createInitialScene();
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return createInitialScene();
  }
  if (!raw) return createInitialScene();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isScene(parsed)) return migrate(parsed);
    return createInitialScene();
  } catch {
    return createInitialScene();
  }
}

function migrate(scene: Scene): Scene {
  if (scene.pressIntensity === undefined) {
    return { ...scene, pressIntensity: DEFAULT_PRESS_INTENSITY };
  }
  return scene;
}

function isScene(value: unknown): value is Scene {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['ballHolderId'] === 'string' &&
    typeof v['phase'] === 'string' &&
    typeof v['variant'] === 'string' &&
    (v['variant'] === 'narrow' ||
      v['variant'] === 'wide' ||
      v['variant'] === 'high') &&
    typeof v['firstTouchPlan'] === 'string' &&
    (v['firstTouchPlan'] === 'clean' ||
      v['firstTouchPlan'] === 'neutral' ||
      v['firstTouchPlan'] === 'dirty') &&
    typeof v['stancePlan'] === 'string' &&
    (v['stancePlan'] === 'open' || v['stancePlan'] === 'closed') &&
    isPassPlan(v['passPlan']) &&
    isPressIntensity(v['pressIntensity']) &&
    typeof v['home'] === 'object' &&
    v['home'] !== null &&
    typeof v['away'] === 'object' &&
    v['away'] !== null &&
    'lastPass' in v &&
    'lastReception' in v
  );
}

function isPressIntensity(value: unknown): boolean {
  return value === undefined || value === 'high' || value === 'mid' || value === 'low';
}

function isPassPlan(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const velocity = v['velocity'];
  const accuracy = v['accuracy'];
  return (
    (velocity === 'soft' || velocity === 'normal' || velocity === 'sharp') &&
    (accuracy === 'precise' ||
      accuracy === 'neutral' ||
      accuracy === 'imprecise')
  );
}

function safeLocalStorage(): Storage | undefined {
  try {
    return typeof globalThis.localStorage === 'undefined'
      ? undefined
      : globalThis.localStorage;
  } catch {
    return undefined;
  }
}
