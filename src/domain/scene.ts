import type { PitchCoord, Player, Team } from './types';
import type { PassOptions } from './pass';
import { DEFAULT_PASS_OPTIONS } from './pass';
import type { FirstTouch, Reception, Stance } from './reception';
import { DEFAULT_RECEPTION } from './reception';
import type { StartVariant } from './startVariants';
import { DEFAULT_START_VARIANT, applyStartVariant } from './startVariants';
import type { PressIntensity } from './pressIntensity';
import { DEFAULT_PRESS_INTENSITY } from './pressIntensity';
import type { BallFlight } from './ballFlight';
import type { Dribble } from './dribble';
import type { PassLaneAssessment } from './passLane';
import { teamFromFormation } from './team';


import { FORMATION_4_3_3, FORMATION_4_4_2 } from './formations';
import { FORMATION_4_2_3_1 } from './formations/away_4231';
import { FORMATION_5_3_2 } from './formations/away_532';
import type { FormationPattern } from './types';

export type Phase = 'buildUp';

/**
 * Eine Szene im Spielaufbau-Simulator. Der Feldzustand (Positionen,
 * Ballträger, Ballflug) wird begleitet von einem festen Satz didaktischer
 * Parameter (Variant, Press-Intensität, …) und – für die Sequenz-Idee –
 * einer `history`: Stack von Pre-Aktion-Snapshots, der Undo erlaubt.
 *
 * `history` speichert Scenes ohne eigene History (`SceneSnapshot`), damit
 * die Datenstruktur nicht rekursiv anwächst.
 */
export type Scene = {
  readonly home: Team;
  readonly away: Team;
  readonly ballHolderId: string;
  readonly ballPos: PitchCoord;
  readonly ballFlight: BallFlight | null;
  readonly dribble: Dribble | null;
  readonly phase: Phase;
  readonly variant: StartVariant;
  readonly firstTouchPlan: FirstTouch;
  readonly stancePlan: Stance;
  readonly passPlan: PassOptions;
  readonly pressIntensity: PressIntensity;
  readonly lastPass: PassOptions | null;
  readonly lastReception: Reception | null;
  /**
   * Geometrische Bewertung der Passlinie des zuletzt gespielten Passes.
   * `null`, solange noch kein Pass lief oder nach Reset. Wird vom Live-
   * Rating genutzt, damit nach einem Pass dasselbe Ergebnis sichtbar ist,
   * das die Preview vorher gezeigt hat.
   */
  readonly lastPassLane: PassLaneAssessment | null;
  readonly history: readonly SceneSnapshot[];
};

export type SceneSnapshot = Omit<Scene, 'history'>;

export function snapshotScene(scene: Scene): SceneSnapshot {
  return {
    home: scene.home,
    away: scene.away,
    ballHolderId: scene.ballHolderId,
    ballPos: scene.ballPos,
    ballFlight: scene.ballFlight,
    dribble: scene.dribble,
    phase: scene.phase,
    variant: scene.variant,
    firstTouchPlan: scene.firstTouchPlan,
    stancePlan: scene.stancePlan,
    passPlan: scene.passPlan,
    pressIntensity: scene.pressIntensity,
    lastPass: scene.lastPass,
    lastReception: scene.lastReception,
    lastPassLane: scene.lastPassLane,
  };
}

export const DEFAULT_AWAY_FORMATION: FormationPattern = '4-4-2';

function awayFormationFor(pattern: FormationPattern) {
  switch (pattern) {
    case '4-4-2':
      return FORMATION_4_4_2;
    case '4-2-3-1':
      return FORMATION_4_2_3_1;
    case '5-3-2':
      return FORMATION_5_3_2;
    case '4-3-3':
      return FORMATION_4_3_3;
  }
}

export function createInitialScene(
  variant: StartVariant = DEFAULT_START_VARIANT,
  firstTouchPlan: FirstTouch = DEFAULT_RECEPTION.firstTouch,
  passPlan: PassOptions = DEFAULT_PASS_OPTIONS,
  stancePlan: Stance = DEFAULT_RECEPTION.stance,
  pressIntensity: PressIntensity = DEFAULT_PRESS_INTENSITY,
  awayFormation: FormationPattern = DEFAULT_AWAY_FORMATION,
): Scene {
  const rawHome = teamFromFormation(FORMATION_4_3_3, 'home');
  const home = applyStartVariant(rawHome, variant);
  const away = teamFromFormation(awayFormationFor(awayFormation), 'away');
  const gk = home.players.find((p) => p.role === 'GK');
  if (!gk) {
    throw new Error('Heimteam benötigt einen Torwart');
  }
  return {
    home,
    away,
    ballHolderId: gk.id,
    ballPos: gk.position,
    ballFlight: null,
    dribble: null,
    phase: 'buildUp',
    variant,
    firstTouchPlan,
    stancePlan,
    passPlan,
    pressIntensity,
    lastPass: null,
    lastReception: null,
    lastPassLane: null,
    history: [],
  };
}

export function findPlayer(scene: Scene, id: string): Player | undefined {
  return (
    scene.home.players.find((p) => p.id === id) ??
    scene.away.players.find((p) => p.id === id)
  );
}
