import type { Scene } from '@/domain/scene';
import { createInitialScene, findPlayer } from '@/domain/scene';
import { DEFAULT_PRESS_INTENSITY } from '@/domain/pressIntensity';
import { DEFAULT_LEAD_PRESET, LEAD_PRESETS } from '@/domain/leadPass';

export const STORAGE_KEY = 'spielaufbau:scene:v3';
export const LEGACY_STORAGE_KEY_V2 = 'spielaufbau:scene:v2';
export const LEGACY_STORAGE_KEY_V1 = 'spielaufbau:scene:v1';

const VALID_AWAY_FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '5-3-2'] as const;

/**
 * Nimmt rohen Persistenzinhalt und liefert eine migrierte `Scene` zurück,
 * falls der Inhalt strukturell gültig ist. Ansonsten `null`. Geteilt von
 * `loadScene` und der Lanes-Persistenz.
 */
export function parseScene(value: unknown): Scene | null {
  if (!isScene(value)) return null;
  return migrate(value);
}

export function safeLocalStorage(): Storage | undefined {
  try {
    return typeof globalThis.localStorage === 'undefined'
      ? undefined
      : globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Schreibt die Szene als JSON unter `STORAGE_KEY` in den lokalen Speicher.
 * Schlägt der Zugriff (z. B. privater Modus, kein Speicher) fehl, wird das
 * mit einem `console.warn` protokolliert und ansonsten ignoriert –
 * Persistenz ist eine Convenience, keine Kernfunktion.
 *
 * Die In-Memory-History wird beim Serialisieren absichtlich verworfen:
 * Undo ist eine Session-Funktion und hätte sonst das Potenzial, die
 * localStorage-Quota (~5 MB) stumm zu sprengen.
 */
export function saveScene(scene: Scene, storage: Storage | undefined = safeLocalStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(serializeScene(scene)));
  } catch (err) {
    warnPersistenceFailure('saveScene', err);
  }
}

/**
 * Version der Szene ohne flüchtige / laufzeitabhängige Felder. Wird für
 * die Persistierung verwendet und ist außerhalb dieses Moduls relevant,
 * damit andere Persistenzpfade (Lanes) denselben Sanitize-Schritt nutzen.
 */
export function serializeScene(scene: Scene): Scene {
  return { ...scene, history: [] };
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
    const parsed = parseScene(value);
    if (parsed) return parsed;
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

function warnPersistenceFailure(op: string, err: unknown): void {
  try {
    // Optionales Logging: im Browser sichtbar, in Tests/SSR irrelevant.
    console.warn(`[spielaufbau] ${op} fehlgeschlagen:`, err);
  } catch {
    // Logging selbst darf nicht werfen.
  }
}

function migrate(scene: Scene): Scene {
  const holder = findPlayer(scene, scene.ballHolderId);
  const fallbackBallPos = holder?.position ?? { x: 50, y: 0 };
  const next: Scene = {
    ...scene,
    pressIntensity: scene.pressIntensity ?? DEFAULT_PRESS_INTENSITY,
    leadPlan: isValidLeadPlan(scene.leadPlan) ? scene.leadPlan : DEFAULT_LEAD_PRESET,
    ballPos: scene.ballPos ?? fallbackBallPos,
    ballFlight: scene.ballFlight ?? null,
    dribble: scene.dribble ?? null,
    lastPassLane: scene.lastPassLane ?? null,
    // History ist reine In-Memory-Session-Information, wird nie geladen.
    history: [],
  };
  return next;
}

function isScene(value: unknown): value is Scene {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v['ballHolderId'] !== 'string') return false;
  if (typeof v['phase'] !== 'string') return false;
  if (
    v['variant'] !== 'narrow' &&
    v['variant'] !== 'wide' &&
    v['variant'] !== 'high' &&
    v['variant'] !== 'switch'
  )
    return false;
  if (
    v['firstTouchPlan'] !== 'clean' &&
    v['firstTouchPlan'] !== 'neutral' &&
    v['firstTouchPlan'] !== 'dirty'
  )
    return false;
  if (v['stancePlan'] !== 'open' && v['stancePlan'] !== 'closed') return false;
  if (!isPassPlan(v['passPlan'])) return false;
  if (!isPressIntensity(v['pressIntensity'])) return false;
  if (!isAwayTeam(v['away'])) return false;
  if (!isHomeTeam(v['home'])) return false;
  if (!('lastPass' in v) || !('lastReception' in v)) return false;
  // ballPos darf fehlen (Legacy) – der Migrationsschritt füllt das auf.
  if (v['ballPos'] !== undefined && !isPitchCoord(v['ballPos'])) return false;
  if (!holderReferencesPlayer(v)) return false;
  return true;
}

function isPressIntensity(value: unknown): boolean {
  return value === undefined || value === 'high' || value === 'mid' || value === 'low';
}

function isValidLeadPlan(value: unknown): value is (typeof LEAD_PRESETS)[number] {
  return (
    typeof value === 'string' &&
    (LEAD_PRESETS as readonly string[]).includes(value)
  );
}

function isPitchCoord(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return isFiniteNumber(v['x']) && isFiniteNumber(v['y']);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPlayer(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['role'] === 'string' &&
    typeof v['label'] === 'string' &&
    isPitchCoord(v['position'])
  );
}

function isHomeTeam(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const players = v['players'];
  if (!Array.isArray(players) || players.length === 0) return false;
  return players.every(isPlayer);
}

function isAwayTeam(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const formation = v['formation'];
  if (
    typeof formation !== 'string' ||
    !(VALID_AWAY_FORMATIONS as readonly string[]).includes(formation)
  )
    return false;
  const players = v['players'];
  if (!Array.isArray(players) || players.length === 0) return false;
  return players.every(isPlayer);
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

function holderReferencesPlayer(scene: Record<string, unknown>): boolean {
  const holderId = scene['ballHolderId'];
  if (typeof holderId !== 'string') return false;
  const home = scene['home'] as { players: Array<{ id: unknown }> } | undefined;
  const away = scene['away'] as { players: Array<{ id: unknown }> } | undefined;
  const inHome = home?.players.some((p) => p.id === holderId) ?? false;
  const inAway = away?.players.some((p) => p.id === holderId) ?? false;
  return inHome || inAway;
}
