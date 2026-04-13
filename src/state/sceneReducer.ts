import type { Scene } from '@/domain/scene';
import { createInitialScene } from '@/domain/scene';
import type { PassAccuracy, PassOptions, PassVelocity } from '@/domain/pass';
import type { FirstTouch, Reception, Stance } from '@/domain/reception';
import type { StartVariant } from '@/domain/startVariants';
import type { PressIntensity } from '@/domain/pressIntensity';
import type { FormationPattern } from '@/domain/types';
import { reactTo } from '@/sim/reactTo';

export type SceneAction =
  | {
      readonly type: 'pass';
      readonly targetId: string;
      readonly velocity?: PassVelocity;
      readonly accuracy?: PassAccuracy;
      readonly firstTouch?: FirstTouch;
      readonly stance?: Stance;
    }
  | { readonly type: 'reset' }
  | { readonly type: 'setVariant'; readonly variant: StartVariant }
  | { readonly type: 'setFirstTouchPlan'; readonly firstTouch: FirstTouch }
  | { readonly type: 'setPassVelocity'; readonly velocity: PassVelocity }
  | { readonly type: 'setPassAccuracy'; readonly accuracy: PassAccuracy }
  | { readonly type: 'setStancePlan'; readonly stance: Stance }
  | { readonly type: 'setPressIntensity'; readonly pressIntensity: PressIntensity }
  | { readonly type: 'setAwayFormation'; readonly awayFormation: FormationPattern };

export function sceneReducer(state: Scene, action: SceneAction): Scene {
  switch (action.type) {
    case 'pass': {
      const target = state.home.players.find((p) => p.id === action.targetId);
      if (!target) return state;
      if (target.id === state.ballHolderId) return state;
      const lastPass: PassOptions = {
        velocity: action.velocity ?? state.passPlan.velocity,
        accuracy: action.accuracy ?? state.passPlan.accuracy,
      };
      const lastReception: Reception = {
        firstTouch: action.firstTouch ?? state.firstTouchPlan,
        stance: action.stance ?? state.stancePlan,
      };
      const afterPass: Scene = {
        ...state,
        ballHolderId: target.id,
        lastPass,
        lastReception,
      };
      return reactTo(afterPass);
    }
    case 'reset':
      return createInitialScene(
        state.variant,
        state.firstTouchPlan,
        state.passPlan,
        state.stancePlan,
        state.pressIntensity,
        state.away.formation,
      );
    case 'setVariant':
      if (state.variant === action.variant) return state;
      return createInitialScene(
        action.variant,
        state.firstTouchPlan,
        state.passPlan,
        state.stancePlan,
        state.pressIntensity,
        state.away.formation,
      );
    case 'setFirstTouchPlan':
      if (state.firstTouchPlan === action.firstTouch) return state;
      return { ...state, firstTouchPlan: action.firstTouch };
    case 'setPassVelocity':
      if (state.passPlan.velocity === action.velocity) return state;
      return {
        ...state,
        passPlan: { ...state.passPlan, velocity: action.velocity },
      };
    case 'setPassAccuracy':
      if (state.passPlan.accuracy === action.accuracy) return state;
      return {
        ...state,
        passPlan: { ...state.passPlan, accuracy: action.accuracy },
      };
    case 'setStancePlan':
      if (state.stancePlan === action.stance) return state;
      return { ...state, stancePlan: action.stance };
    case 'setPressIntensity':
      if (state.pressIntensity === action.pressIntensity) return state;
      return { ...state, pressIntensity: action.pressIntensity };
    case 'setAwayFormation':
      if (state.away.formation === action.awayFormation) return state;
      return createInitialScene(
        state.variant,
        state.firstTouchPlan,
        state.passPlan,
        state.stancePlan,
        state.pressIntensity,
        action.awayFormation,
      );
  }
}

export { createInitialScene };
