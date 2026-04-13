import type { Formation, Player, PitchCoord, Team, TeamSide } from './types';

/**
 * Wandelt eine Formation aus dem Template-Frame (eigenes Tor bei y=0)
 * in eine Mannschaft im Welt-Frame (Heim-Tor bei y=0, Gast-Tor bei y=100).
 *
 * Für das Heimteam ist der Welt-Frame identisch zum Template-Frame.
 * Für das Gastteam werden x und y gespiegelt.
 */
export function teamFromFormation(formation: Formation, side: TeamSide): Team {
  const players: Player[] = formation.slots.map((slot, index) => ({
    id: `${side}-${slot.role}-${index}`,
    role: slot.role,
    label: slot.label,
    position: toWorldCoord(slot.position, side),
  }));

  return {
    side,
    formation: formation.pattern,
    players,
  };
}

function toWorldCoord(p: PitchCoord, side: TeamSide): PitchCoord {
  if (side === 'home') {
    return p;
  }
  return { x: 100 - p.x, y: 100 - p.y };
}
