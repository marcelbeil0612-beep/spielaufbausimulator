import type { PitchCoord } from './types';

/**
 * Voreinstellungen für Lead-Pässe: statt genau auf den Empfänger zu
 * spielen, legt der Passgeber den Ball in einen Raum rund um ihn. Die
 * Werte stehen in Welt-Einheiten und beziehen sich auf die Angriffsseite
 * des Ballführers. Für das Heimteam (spielt Richtung y=100) bedeutet +y
 * "nach vorne"; für ein gespiegeltes Team dreht `leadOffsetFor` das
 * Vorzeichen.
 *
 * Die Offsets sind so gewählt, dass sie innerhalb des
 * `RECEIVER_RUN_MAX=12` bleiben, damit der Empfänger den Ball im
 * Ballflugfenster realistisch erreichen kann.
 */
export type LeadPreset =
  | 'none'
  | 'short-ahead'
  | 'far-ahead'
  | 'diagonal-left'
  | 'diagonal-right';

export const LEAD_PRESETS: readonly LeadPreset[] = [
  'none',
  'short-ahead',
  'far-ahead',
  'diagonal-left',
  'diagonal-right',
] as const;

export const LEAD_PRESET_LABELS: Record<LeadPreset, string> = {
  none: 'kein',
  'short-ahead': 'kurz vorne',
  'far-ahead': 'weit vorne',
  'diagonal-left': 'diagonal links',
  'diagonal-right': 'diagonal rechts',
};

export const DEFAULT_LEAD_PRESET: LeadPreset = 'none';

const OFFSETS: Record<LeadPreset, PitchCoord> = {
  none: { x: 0, y: 0 },
  'short-ahead': { x: 0, y: 4 },
  'far-ahead': { x: 0, y: 10 },
  'diagonal-left': { x: -6, y: 6 },
  'diagonal-right': { x: 6, y: 6 },
};

/**
 * Lead-Offset für den Ballführer-Frame: `attackerIsHome=true` entspricht
 * Angriff in +y-Richtung, für Gastteams spiegelt die Funktion x und y.
 */
export function leadOffsetFor(
  preset: LeadPreset,
  attackerIsHome: boolean = true,
): PitchCoord {
  const base = OFFSETS[preset];
  return attackerIsHome ? base : { x: -base.x, y: -base.y };
}
