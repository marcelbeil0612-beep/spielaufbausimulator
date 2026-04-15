import { distance } from './geometry';
import type { PassVelocity } from './pass';
import type { PitchCoord, RoleCode } from './types';

/**
 * Physik-Primitiven für den Zeit-Axis-Umbau.
 *
 * Arbeitsannahme: **1 Welt-Einheit ≈ 1 m**. Das idealisierte 100×100-Feld
 * weicht leicht vom realen 105×68-Rasen ab – die Beschleunigungs- und
 * Geschwindigkeitswerte sind so gewählt, dass sie auf diesem idealisierten
 * Feld plausible Flug- und Laufzeiten erzeugen.
 */

/**
 * Effektive Ballgeschwindigkeit in m/s (bereits gemittelt über Roll-/Abbrems-
 * phase, daher niedriger als Schuss-Spitzen).
 */
export const BALL_SPEED_BY_VELOCITY: Record<PassVelocity, number> = {
  soft: 12,
  normal: 22,
  sharp: 30,
};

/**
 * Rollengewichtete Verschiebegeschwindigkeit in m/s. Entspricht grob dem
 * Tempo, mit dem ein Feldspieler taktisch ohne Ball verschiebt – kein
 * Sprint, sondern das realistische Arbeitstempo im Pressing/Rückzug.
 */
export const PLAYER_SHIFT_SPEED_BY_ROLE: Record<RoleCode, number> = {
  GK: 4.5,
  LB: 6.0,
  LCB: 5.0,
  RCB: 5.0,
  RB: 6.0,
  CDM: 6.0,
  LCM: 6.0,
  RCM: 6.0,
  CAM: 6.0,
  LM: 6.5,
  RM: 6.5,
  LW: 6.5,
  RW: 6.5,
  ST: 6.5,
};

export const DEFAULT_PLAYER_SHIFT_SPEED = 6.0;

/**
 * Flugzeit des Balls zwischen zwei Punkten für eine gegebene Passschärfe.
 * Einheit: Sekunden.
 */
export function ballFlightTime(
  from: PitchCoord,
  to: PitchCoord,
  velocity: PassVelocity,
): number {
  const d = distance(from, to);
  const speed = BALL_SPEED_BY_VELOCITY[velocity];
  return d / speed;
}

/**
 * Maximale Strecke, die ein Spieler der angegebenen Rolle in `dtSeconds`
 * taktisch verschieben kann.
 */
export function maxShiftDistance(dtSeconds: number, role: RoleCode): number {
  if (dtSeconds <= 0) return 0;
  const speed = PLAYER_SHIFT_SPEED_BY_ROLE[role] ?? DEFAULT_PLAYER_SHIFT_SPEED;
  return speed * dtSeconds;
}
