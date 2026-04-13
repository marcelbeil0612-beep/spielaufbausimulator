import type { Scene } from '@/domain/scene';
import type { Lane, LanesState } from './lanes';
import { createInitialLanesState } from './lanes';
import { loadScene, parseScene, safeLocalStorage } from './persistence';

export const LANES_STORAGE_KEY = 'spielaufbau:lanes:v4';

/**
 * Schreibt die Lanes-State als JSON. Fehlschläge (Quota, Security) werden
 * stillschweigend ignoriert – Persistenz ist Convenience.
 */
export function saveLanes(
  state: LanesState,
  storage: Storage | undefined = safeLocalStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(LANES_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignorieren
  }
}

/**
 * Lädt den Lanes-State. Versucht in Reihenfolge:
 *   1. v4-Lanes (aktuelles Schema)
 *   2. v3/v2/v1-Einzel-Szene via `loadScene`, eingewickelt in eine Lane
 *   3. frischer Initial-State
 */
export function loadLanes(
  storage: Storage | undefined = safeLocalStorage(),
): LanesState {
  if (!storage) return createInitialLanesState();
  const raw = tryReadJson(storage, LANES_STORAGE_KEY);
  const parsed = parseLanes(raw);
  if (parsed) return parsed;
  return createInitialLanesState(loadScene(storage));
}

export function parseLanes(value: unknown): LanesState | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v['activeLaneId'] !== 'string') return null;
  if (!Array.isArray(v['lanes'])) return null;
  const lanes: Lane[] = [];
  for (const raw of v['lanes'] as unknown[]) {
    const lane = parseLane(raw);
    if (!lane) return null;
    lanes.push(lane);
  }
  if (lanes.length === 0) return null;
  const activeLaneId = v['activeLaneId'];
  if (!lanes.some((l) => l.id === activeLaneId)) return null;
  return { lanes, activeLaneId };
}

function parseLane(value: unknown): Lane | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v['id'] !== 'string') return null;
  const scene: Scene | null = parseScene(v['scene']);
  if (!scene) return null;
  return { id: v['id'], scene };
}

function tryReadJson(storage: Storage, key: string): unknown {
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
