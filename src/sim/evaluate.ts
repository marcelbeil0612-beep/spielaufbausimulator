import type { Scene } from '@/domain/scene';
import { findPlayer } from '@/domain/scene';
import { distance } from '@/domain/geometry';
import type { PassLaneAssessment } from './passLane';

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
 * Passlinie (nur in der Vorschau sinnvoll, daher optional):
 *  - `blockers ≥ 1` ⇒ `loss-danger`: ein Gegner steht im Abfangradius der
 *    Passlinie – der Pass kommt gar nicht erst an.
 *  - `threats ≥ 1` eskaliert mindestens auf `risky`: die Passlinie ist
 *    eingeengt, der Empfänger bekommt den Ball unter Druck.
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
  readonly laneBlocked: boolean;
  readonly laneThreatened: boolean;
};

export type ReasonCode =
  | 'no-holder'
  | 'lane-blocked'
  | 'overload'
  | 'close-contact-dirty'
  | 'sharp-dirty'
  | 'sharp-imprecise-press'
  | 'closed-dirty-press'
  | 'lane-threatened'
  | 'two-pressers'
  | 'dirty'
  | 'imprecise'
  | 'one-presser'
  | 'open';

export type Evaluation = {
  readonly rating: Rating;
  readonly code: ReasonCode;
  readonly reason: string;
};

const REASON_TEXT: Record<ReasonCode, string> = {
  'no-holder': 'Kein Ballträger – niemand kann den Ball spielen.',
  'lane-blocked':
    'Gegner fängt die Passlinie ab – der Pass kommt gar nicht erst an.',
  overload:
    'Drei oder mehr Gegner im Presseradius – der Ballträger ist überladen.',
  'close-contact-dirty':
    'Gegner im Nahkontakt bei unsauberer Annahme – der Ball springt dem Gegner zu.',
  'sharp-dirty':
    'Scharfer Pass auf unsaubere Annahme – der Empfänger hat zu wenig Zeit, den Ball zu kontrollieren.',
  'sharp-imprecise-press':
    'Scharfer, ungenauer Pass unter Pressing – der Empfänger wird überrumpelt.',
  'closed-dirty-press':
    'Geschlossene Stellung und unsaubere Annahme unter Pressing – der Spieler dreht sich in den Gegner rein.',
  'lane-threatened':
    'Passlinie ist eingeengt – der Empfänger bekommt den Ball unter direktem Druck.',
  'two-pressers':
    'Zwei Gegner im Presseradius – der Ballträger muss schnell eine Lösung finden.',
  dirty: 'Unsaubere Annahme – der Empfänger verliert beim Mitnehmen Zeit.',
  imprecise:
    'Ungenauer Pass ohne Entschärfung – der Empfänger muss ihm nachjagen.',
  'one-presser':
    'Ein Gegner im Presseradius – lösbar mit sauberer Annahme oder schnellem Weiterspielen.',
  open: 'Offene Situation – der Ball kann in Ruhe weitergespielt werden.',
};

/**
 * Erste zutreffende Ballverlust-Regel in fester Priorität.
 * `undefined` wenn kein Pfad greift.
 */
function firstLossDangerCode(s: Signals): ReasonCode | undefined {
  if (s.laneBlocked) return 'lane-blocked';
  if (s.pressers >= 3) return 'overload';
  if (s.closest <= CLOSE_CONTACT_RADIUS && s.dirty) return 'close-contact-dirty';
  if (s.sharp && s.dirty) return 'sharp-dirty';
  if (s.sharp && s.imprecise && s.pressers >= 1) return 'sharp-imprecise-press';
  if (s.closedStance && s.dirty && s.pressers >= 1) return 'closed-dirty-press';
  return undefined;
}

/**
 * Liefert Bewertung + dominierenden Grund. Die Reihenfolge der Prüfungen
 * spiegelt die Rating-Priorität (loss-danger > risky > pressure > open):
 * der erste greifende Pfad bestimmt `code` und `reason`.
 */
export function explainRating(
  scene: Scene,
  passLane?: PassLaneAssessment,
): Evaluation {
  const holder = findPlayer(scene, scene.ballHolderId);
  if (!holder) {
    return {
      rating: 'open',
      code: 'no-holder',
      reason: REASON_TEXT['no-holder'],
    };
  }

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
    laneBlocked: (passLane?.blockers ?? 0) >= 1,
    laneThreatened: (passLane?.threats ?? 0) >= 1,
  };

  const lossCode = firstLossDangerCode(signals);
  if (lossCode) {
    return {
      rating: 'loss-danger',
      code: lossCode,
      reason: REASON_TEXT[lossCode],
    };
  }

  const { pressers, dirty, imprecise, soft, openStance, laneThreatened } = signals;
  const impreciseCushioned =
    imprecise && (soft || openStance) && pressers <= 1 && !dirty;
  const impreciseEscalates = imprecise && !impreciseCushioned;

  let riskyCode: ReasonCode | undefined;
  if (laneThreatened) riskyCode = 'lane-threatened';
  else if (pressers >= 2) riskyCode = 'two-pressers';
  else if (dirty) riskyCode = 'dirty';
  else if (impreciseEscalates) riskyCode = 'imprecise';

  if (riskyCode) {
    return {
      rating: 'risky',
      code: riskyCode,
      reason: REASON_TEXT[riskyCode],
    };
  }

  if (pressers === 1) {
    return {
      rating: 'pressure',
      code: 'one-presser',
      reason: REASON_TEXT['one-presser'],
    };
  }

  return { rating: 'open', code: 'open', reason: REASON_TEXT.open };
}

export function evaluate(scene: Scene, passLane?: PassLaneAssessment): Rating {
  return explainRating(scene, passLane).rating;
}
