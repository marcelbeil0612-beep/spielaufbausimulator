import type { Scene } from './scene';
import { createInitialScene } from './scene';
import type { StartVariant } from './startVariants';
import type { FirstTouch, Stance } from './reception';
import type { PassOptions } from './pass';
import type { PressIntensity } from './pressIntensity';
import type { FormationPattern, PitchCoord, RoleCode, Team } from './types';

/**
 * Eine Szenario-Vorlage = vollständig parametrisierte Start-Szene plus
 * optionale manuelle Spieler-Verschiebungen. Die Szenario-Bibliothek
 * liefert didaktische Lehrfälle, die sich per Klick laden lassen.
 */
export type Scenario = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly build: () => Scene;
};

type ScenarioSpec = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly variant?: StartVariant;
  readonly firstTouch?: FirstTouch;
  readonly stance?: Stance;
  readonly passPlan?: PassOptions;
  readonly pressIntensity?: PressIntensity;
  readonly awayFormation?: FormationPattern;
  readonly ballHolderRole?: RoleCode;
  readonly ballHolderIndex?: number;
  readonly homeMoves?: readonly PlayerMove[];
  readonly awayMoves?: readonly PlayerMove[];
};

type PlayerMove = {
  readonly role: RoleCode;
  readonly index?: number;
  readonly position: PitchCoord;
};

function buildScenario(spec: ScenarioSpec): Scenario {
  return {
    id: spec.id,
    label: spec.label,
    description: spec.description,
    build: () => {
      const base = createInitialScene(
        spec.variant,
        spec.firstTouch,
        spec.passPlan,
        spec.stance,
        spec.pressIntensity,
        spec.awayFormation,
      );
      const home = applyMoves(base.home, spec.homeMoves);
      const away = applyMoves(base.away, spec.awayMoves);
      const holder = spec.ballHolderRole
        ? findPlayerByRole(home, spec.ballHolderRole, spec.ballHolderIndex)
        : undefined;
      return {
        ...base,
        home,
        away,
        ballHolderId: holder?.id ?? base.ballHolderId,
        ballPos: holder?.position ?? base.ballPos,
      };
    },
  };
}

export const SCENARIOS: readonly Scenario[] = [
  buildScenario({
    id: 'build-up-high-press',
    label: 'Aufbau gegen hohes Pressing',
    description:
      '4-3-3 gegen 4-4-2 mit frühem Druck. Torwart und Innenverteidiger müssen die erste Linie unter Zeitdruck lösen.',
  }),
  buildScenario({
    id: 'build-up-mid-block',
    label: 'Aufbau gegen Mittelfeldpressing',
    description:
      'Der Gegner wartet tiefer im 4-4-2. Die erste Linie ist spielbar, die nächste Entscheidung fällt vor dem Mittelfeldblock.',
    variant: 'wide',
    pressIntensity: 'mid',
  }),
  buildScenario({
    id: 'build-up-low-block',
    label: 'Aufbau gegen tiefes Pressing',
    description:
      '5-3-2 im tiefen Block. Vorne ist Zeit, aber Zwischenlinien- und Halbraumfenster müssen sauber erkannt werden.',
    awayFormation: '5-3-2',
    variant: 'wide',
    pressIntensity: 'low',
  }),
  buildScenario({
    id: 'six-under-pressure',
    label: 'Sechser unter Druck',
    description:
      'Die 6 erhält unter Gegnerdruck. Kurz lösen, klatschen oder auf den freien Innenverteidiger zurückspielen.',
    awayFormation: '4-2-3-1',
    ballHolderRole: 'CDM',
    pressIntensity: 'high',
    homeMoves: [
      { role: 'CDM', position: { x: 50, y: 34 } },
      { role: 'LCM', position: { x: 34, y: 48 } },
      { role: 'RCM', position: { x: 66, y: 48 } },
    ],
    awayMoves: [
      { role: 'ST', position: { x: 50, y: 29 } },
      { role: 'CAM', position: { x: 50, y: 40 } },
      { role: 'CDM', index: 0, position: { x: 42, y: 45 } },
      { role: 'CDM', index: 1, position: { x: 58, y: 45 } },
    ],
  }),
  buildScenario({
    id: 'fullback-trapped-backpass',
    label: 'Außen zugestellt, Rückpass offen',
    description:
      'Der Außenverteidiger bekommt am Flügel Druck. Der direkte Weg nach vorn ist eng, der Rückpass bleibt die saubere Lösung.',
    ballHolderRole: 'RB',
    pressIntensity: 'high',
    homeMoves: [
      { role: 'RB', position: { x: 86, y: 40 } },
      { role: 'RCM', position: { x: 68, y: 52 } },
      { role: 'RW', position: { x: 90, y: 68 } },
    ],
    awayMoves: [
      { role: 'LM', position: { x: 84, y: 45 } },
      { role: 'LCM', position: { x: 73, y: 46 } },
      { role: 'ST', index: 0, position: { x: 69, y: 32 } },
    ],
  }),
  buildScenario({
    id: 'bounce-pass-under-pressure',
    label: 'Klatschball unter Druck',
    description:
      'Ein hoher Zielspieler lässt unter Gegnerdruck prallen. Timing und Anschlusswinkel der Nachrücker werden direkt sichtbar.',
    awayFormation: '4-2-3-1',
    ballHolderRole: 'ST',
    passPlan: { velocity: 'sharp', accuracy: 'neutral' },
    pressIntensity: 'high',
    homeMoves: [
      { role: 'ST', position: { x: 50, y: 58 } },
      { role: 'LCM', position: { x: 38, y: 49 } },
      { role: 'RCM', position: { x: 62, y: 49 } },
      { role: 'CDM', position: { x: 50, y: 36 } },
    ],
    awayMoves: [
      { role: 'LCB', position: { x: 46, y: 66 } },
      { role: 'RCB', position: { x: 54, y: 66 } },
      { role: 'CDM', index: 0, position: { x: 45, y: 52 } },
      { role: 'CDM', index: 1, position: { x: 55, y: 52 } },
    ],
  }),
  buildScenario({
    id: 'open-switch',
    label: 'Offene Verlagerung',
    description:
      'Der Gegner ist ballnah verschoben. Die weite Seite ist offen, wenn Balltempo und Orientierung vor dem Wechsel passen.',
    variant: 'switch',
    ballHolderRole: 'LCB',
    passPlan: { velocity: 'sharp', accuracy: 'precise' },
    pressIntensity: 'high',
    homeMoves: [
      { role: 'LB', position: { x: 14, y: 30 } },
      { role: 'RB', position: { x: 88, y: 40 } },
      { role: 'LW', position: { x: 18, y: 62 } },
      { role: 'RW', position: { x: 90, y: 70 } },
    ],
    awayMoves: [
      { role: 'LM', position: { x: 30, y: 46 } },
      { role: 'LCM', position: { x: 40, y: 46 } },
      { role: 'RM', position: { x: 58, y: 52 } },
      { role: 'ST', index: 0, position: { x: 38, y: 30 } },
      { role: 'ST', index: 1, position: { x: 48, y: 32 } },
    ],
  }),
];

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

function applyMoves(team: Team, moves: readonly PlayerMove[] | undefined): Team {
  if (!moves || moves.length === 0) return team;
  const roleCounts = new Map<RoleCode, number>();
  return {
    ...team,
    players: team.players.map((player) => {
      const index = roleCounts.get(player.role) ?? 0;
      roleCounts.set(player.role, index + 1);
      const move = moves.find((entry) => {
        return entry.role === player.role && (entry.index ?? 0) === index;
      });
      if (!move) return player;
      return {
        ...player,
        position: move.position,
      };
    }),
  };
}

function findPlayerByRole(
  team: Team,
  role: RoleCode,
  index = 0,
) {
  let seen = 0;
  for (const player of team.players) {
    if (player.role !== role) continue;
    if (seen === index) return player;
    seen += 1;
  }
  return undefined;
}
