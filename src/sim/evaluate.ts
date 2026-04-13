import type { Scene } from '@/domain/scene';
import { findPlayer } from '@/domain/scene';
import { distance } from '@/domain/geometry';

export type Rating = 'open' | 'pressure' | 'risky' | 'loss-danger';

/**
 * Radius, innerhalb dessen ein Gegner den Ballträger unter Druck setzt.
 */
export const PRESSURE_RADIUS = 12;

/**
 * Naher Körperkontakt-Radius. Kombiniert mit einer schlechten Annahme
 * bedeutet dieser Radius akute Ballverlustgefahr.
 */
export const CLOSE_CONTACT_RADIUS = 5;

/**
 * Vier-stufige Bewertung der aktuellen Spielsituation:
 *  - open        : 0 Gegner im PRESSURE_RADIUS
 *  - pressure    : genau 1 Gegner im PRESSURE_RADIUS
 *  - risky       : 2 Gegner im PRESSURE_RADIUS, ODER dirty Annahme,
 *                  ODER ungenauer Pass
 *  - loss-danger : ≥ 3 Gegner im PRESSURE_RADIUS, ODER
 *                  (Gegner im CLOSE_CONTACT_RADIUS UND dirty Annahme), ODER
 *                  (scharfer Pass UND dirty Annahme), ODER
 *                  (scharfer Pass UND ungenauer Pass UND ≥ 1 Presser), ODER
 *                  (geschlossene Stellung UND dirty Annahme UND ≥ 1 Presser)
 *
 * Passschärfe-Modifier:
 *  - `sharp` eskaliert Fehlerquellen: scharfer Pass ohne saubere Annahme
 *    bzw. bei Ungenauigkeit unter Pressingzugriff springt direkt auf
 *    `loss-danger`, weil der Empfänger weniger Zeit hat, den Ball zu
 *    kontrollieren.
 *  - `soft` entschärft einen reinen Ungenauigkeitsfehler unter geringem
 *    Druck (≤ 1 Presser, nicht dirty): der Empfänger bekommt mehr Zeit,
 *    das Rating bleibt auf dem Pressing-Niveau statt auf `risky`.
 *  - `normal` bleibt neutral.
 *
 * Stance-Modifier (Körperstellung des Empfängers):
 *  - `closed` eskaliert: dirty Annahme unter Pressing in geschlossener
 *    Stellung – Spieler dreht sich in den Gegner rein und sieht das Spiel
 *    nicht – springt direkt auf `loss-danger`.
 *  - `open` entschärft analog zu `soft` einen reinen Ungenauigkeitsfehler
 *    unter geringem Druck (≤ 1 Presser, nicht dirty): offene Stellung gibt
 *    dem Empfänger Übersicht, das Rating bleibt auf dem Pressing-Niveau.
 *
 * Priorität: loss-danger > risky > pressure > open.
 */
type Signals = {
  readonly pressers: number;
  readonly closest: number;
  readonly dirty: boolean;
  readonly imprecise: boolean;
  readonly sharp: boolean;
  readonly soft: boolean;
  readonly openStance: boolean;
  readonly closedStance: boolean;
};

/**
 * Prüft die fünf Ballverlust-Pfade in fester Priorität:
 *  1. Überzahl-Pressing (≥ 3 Presser)
 *  2. Naher Körperkontakt + unsaubere Annahme
 *  3. Scharfer Pass + unsaubere Annahme
 *  4. Scharfer + ungenauer Pass unter Pressingzugriff
 *  5. Geschlossene Stellung + unsaubere Annahme unter Pressingzugriff
 */
function isLossDanger(s: Signals): boolean {
  if (s.pressers >= 3) return true;
  if (s.closest <= CLOSE_CONTACT_RADIUS && s.dirty) return true;
  if (s.sharp && s.dirty) return true;
  if (s.sharp && s.imprecise && s.pressers >= 1) return true;
  if (s.closedStance && s.dirty && s.pressers >= 1) return true;
  return false;
}

export function evaluate(scene: Scene): Rating {
  const holder = findPlayer(scene, scene.ballHolderId);
  if (!holder) return 'open';

  const attackerIsHome = scene.home.players.some((p) => p.id === holder.id);
  const opp = attackerIsHome ? scene.away : scene.home;

  const distances = opp.players.map((p) => distance(p.position, holder.position));
  const signals: Signals = {
    pressers: distances.filter((d) => d <= PRESSURE_RADIUS).length,
    closest: distances.reduce((min, d) => (d < min ? d : min), Infinity),
    dirty: scene.lastReception?.firstTouch === 'dirty',
    imprecise: scene.lastPass?.accuracy === 'imprecise',
    sharp: scene.lastPass?.velocity === 'sharp',
    soft: scene.lastPass?.velocity === 'soft',
    openStance: scene.lastReception?.stance === 'open',
    closedStance: scene.lastReception?.stance === 'closed',
  };

  if (isLossDanger(signals)) return 'loss-danger';

  const { pressers, dirty, imprecise, soft, openStance } = signals;
  const impreciseCushioned =
    imprecise && (soft || openStance) && pressers <= 1 && !dirty;
  const impreciseEscalates = imprecise && !impreciseCushioned;

  if (pressers >= 2 || dirty || impreciseEscalates) return 'risky';
  if (pressers === 1) return 'pressure';
  return 'open';
}
