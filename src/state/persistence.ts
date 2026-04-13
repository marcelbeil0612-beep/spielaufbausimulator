import type { Scene } from '@/domain/scene';
import { createInitialScene, findPlayer } from '@/domain/scene';
import { DEFAULT_PRESS_INTENSITY } from '@/domain/pressIntensity';

export const STORAGE_KEY = 'spielaufbau:scene:v3';
export const LEGACY_STORAGE_KEY_V2 = 'spielaufbau:scene:v2';
export const LEGACY_STORAGE_KEY_V1 = 'spielaufbau:scene:v1';

const VALID_AWAY_FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '5-3-2'] as const;

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
 * Lädt die gespeicherte Szene. Versucht v3 → v2 → v1 und migriert
 * das Ergebnis. Bei strukturell invalider oder fehlender Szene wird
 * `createInitialScene` zurückgegeben.
 */
export function loadScene(storage: Storage | undefined = safeLocalStorage()): Scene {
  if (!storage) return createInitialScene();

  for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY_V2, LEGACY_STORAGE_KEY_V1]) {
    const value = tryRead(storage, key);
    if (value && isScene(value)) return migrate(value);
  }
  return createInitialScene();
}

function tryRead(storage: Storage, key: string): unknown {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function migrate(scene: Scene): Scene {
  const holder = findPlayer(scene, scene.ballHolderId);
  const fallbackBallPos = holder?.position ?? { x: 50, y: 0 };
  const next: Scene = {
    ...scene,
    pressIntensity: scene.pressIntensity ?? DEFAULT_PRESS_INTENSITY,
    ballPos: scene.ballPos ?? fallbackBallPos,
    ballFlight: scene.ballFlight ?? null,
  };
  return next;
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
      v['variant'] === 'high' ||
      v['variant'] === 'switch') &&
    typeof v['firstTouchPlan'] === 'string' &&
    (v['firstTouchPlan'] === 'clean' ||
      v['firstTouchPlan'] === 'neutral' ||
      v['firstTouchPlan'] === 'dirty') &&
    typeof v['stancePlan'] === 'string' &&
    (v['stancePlan'] === 'open' || v['stancePlan'] === 'closed') &&
    isPassPlan(v['passPlan']) &&
    isPressIntensity(v['pressIntensity']) &&
    isAwayTeam(v['away']) &&
    typeof v['home'] === 'object' &&
    v['home'] !== null &&
    'lastPass' in v &&
    'lastReception' in v
  );
}

function isPressIntensity(value: unknown): boolean {
  return value === undefined || value === 'high' || value === 'mid' || value === 'low';
}

function isAwayTeam(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const formation = v['formation'];
  return (
    typeof formation === 'string' &&
    (VALID_AWAY_FORMATIONS as readonly string[]).includes(formation)
  );
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
