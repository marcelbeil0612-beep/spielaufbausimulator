import type { Player, Team } from './types';
import type { PassOptions } from './pass';
import { DEFAULT_PASS_OPTIONS } from './pass';
import type { FirstTouch, Reception } from './reception';
import { DEFAULT_RECEPTION } from './reception';
import type { StartVariant } from './startVariants';
import { DEFAULT_START_VARIANT, applyStartVariant } from './startVariants';
import { teamFromFormation } from './team';
import { FORMATION_4_3_3, FORMATION_4_4_2 } from './formations';

export type Phase = 'buildUp';

export type Scene = {
  readonly home: Team;
  readonly away: Team;
  readonly ballHolderId: string;
  readonly phase: Phase;
  readonly variant: StartVariant;
  readonly firstTouchPlan: FirstTouch;
  readonly passPlan: PassOptions;
  readonly lastPass: PassOptions | null;
  readonly lastReception: Reception | null;
};

export function createInitialScene(
  variant: StartVariant = DEFAULT_START_VARIANT,
  firstTouchPlan: FirstTouch = DEFAULT_RECEPTION.firstTouch,
  passPlan: PassOptions = DEFAULT_PASS_OPTIONS,
): Scene {
  const rawHome = teamFromFormation(FORMATION_4_3_3, 'home');
  const home = applyStartVariant(rawHome, variant);
  const away = teamFromFormation(FORMATION_4_4_2, 'away');
  const gk = home.players.find((p) => p.role === 'GK');
  if (!gk) {
    throw new Error('Heimteam benötigt einen Torwart');
  }
  return {
    home,
    away,
    ballHolderId: gk.id,
    phase: 'buildUp',
    variant,
    firstTouchPlan,
    passPlan,
    lastPass: null,
    lastReception: null,
  };
}

export function findPlayer(scene: Scene, id: string): Player | undefined {
  return (
    scene.home.players.find((p) => p.id === id) ??
    scene.away.players.find((p) => p.id === id)
  );
}
