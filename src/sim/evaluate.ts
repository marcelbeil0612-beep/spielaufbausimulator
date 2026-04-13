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
 *                  (scharfer Pass UND ungenauer Pass UND ≥ 1 Presser)
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
 * Priorität: loss-danger > risky > pressure > open.
 */
export function evaluate(scene: Scene): Rating {
  const holder = findPlayer(scene, scene.ballHolderId);
  if (!holder) return 'open';

  const attackerIsHome = scene.home.players.some((p) => p.id === holder.id);
  const opp = attackerIsHome ? scene.away : scene.home;

  const distances = opp.players.map((p) => distance(p.position, holder.position));
  const pressers = distances.filter((d) => d <= PRESSURE_RADIUS).length;
  const closest = distances.reduce((min, d) => (d < min ? d : min), Infinity);

  const dirty = scene.lastReception?.firstTouch === 'dirty';
  const imprecise = scene.lastPass?.accuracy === 'imprecise';
  const sharp = scene.lastPass?.velocity === 'sharp';
  const soft = scene.lastPass?.velocity === 'soft';

  if (pressers >= 3) return 'loss-danger';
  if (closest <= CLOSE_CONTACT_RADIUS && dirty) return 'loss-danger';
  if (sharp && dirty) return 'loss-danger';
  if (sharp && imprecise && pressers >= 1) return 'loss-danger';

  const impreciseEscalates = imprecise && !(soft && pressers <= 1 && !dirty);

  if (pressers >= 2 || dirty || impreciseEscalates) return 'risky';
  if (pressers === 1) return 'pressure';
  return 'open';
}
