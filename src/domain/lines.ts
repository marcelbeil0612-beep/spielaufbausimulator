import type { RoleCode, Team } from './types';

export type TeamLines = {
  readonly defense: number;
  readonly midfield: number;
  readonly attack: number;
};

const DEFENSE_ROLES: readonly RoleCode[] = ['LB', 'LCB', 'RCB', 'RB'];
const MIDFIELD_ROLES: readonly RoleCode[] = [
  'CDM',
  'LCM',
  'RCM',
  'CAM',
  'LM',
  'RM',
];
const ATTACK_ROLES: readonly RoleCode[] = ['LW', 'ST', 'RW'];

function avgY(team: Team, roles: readonly RoleCode[]): number {
  const ys = team.players
    .filter((p) => roles.includes(p.role))
    .map((p) => p.position.y);
  if (ys.length === 0) return Number.NaN;
  return ys.reduce((sum, y) => sum + y, 0) / ys.length;
}

/**
 * Durchschnittliche Y-Koordinate der Abwehr-, Mittelfeld- und Angriffslinie
 * in Welt-Einheiten (x,y ∈ [0,100]). Für das auswärts gespiegelte Team
 * ergeben sich entsprechend hohe Y-Werte.
 */
export function getLines(team: Team): TeamLines {
  return {
    defense: avgY(team, DEFENSE_ROLES),
    midfield: avgY(team, MIDFIELD_ROLES),
    attack: avgY(team, ATTACK_ROLES),
  };
}
