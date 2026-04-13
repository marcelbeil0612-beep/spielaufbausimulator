/**
 * Presshöhe der Gegnermannschaft.
 *  - `high`: aggressives, hohes Pressing (Status quo)
 *  - `mid` : moderates Mittelfeldpressing
 *  - `low` : tiefer Block, kaum aktives Attackieren
 */
export type PressIntensity = 'high' | 'mid' | 'low';

export const PRESS_INTENSITIES: readonly PressIntensity[] = [
  'high',
  'mid',
  'low',
] as const;

export const PRESS_INTENSITY_LABELS: Record<PressIntensity, string> = {
  high: 'Hohes Pressing',
  mid: 'Mittelfeldpressing',
  low: 'Tiefer Block',
};

export const DEFAULT_PRESS_INTENSITY: PressIntensity = 'high';
