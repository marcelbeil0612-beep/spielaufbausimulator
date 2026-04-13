import type { Scene } from '@/domain/scene';
import { createInitialScene, findPlayer, snapshotScene } from '@/domain/scene';
import type { PassAccuracy, PassOptions, PassVelocity } from '@/domain/pass';
import type { FirstTouch, Reception, Stance } from '@/domain/reception';
import type { StartVariant } from '@/domain/startVariants';
import type { PressIntensity } from '@/domain/pressIntensity';
import type { BallFlight } from '@/domain/ballFlight';
import type { Dribble, DribbleSpeed } from '@/domain/dribble';
import { DEFAULT_DRIBBLE_SPEED, dribbleDuration } from '@/domain/dribble';
import type { FormationPattern, PitchCoord } from '@/domain/types';
import { ballFlightTime } from '@/domain/physics';
import { advanceFlight } from '@/sim/advanceFlight';
import { advanceDribble } from '@/sim/advanceDribble';

export type SceneAction =
  | {
      readonly type: 'pass';
      readonly targetId: string;
      readonly velocity?: PassVelocity;
      readonly accuracy?: PassAccuracy;
      readonly firstTouch?: FirstTouch;
      readonly stance?: Stance;
    }
  | {
      readonly type: 'dribble';
      readonly targetPos: PitchCoord;
      readonly speed?: DribbleSpeed;
    }
  | { readonly type: 'advanceTime'; readonly dt: number }
  | { readonly type: 'seekFlight'; readonly progress: number }
  | { readonly type: 'skipFlight' }
  | { readonly type: 'undo' }
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
      const holder = findPlayer(state, state.ballHolderId);
      if (!holder) return state;
      const lastPass: PassOptions = {
        velocity: action.velocity ?? state.passPlan.velocity,
        accuracy: action.accuracy ?? state.passPlan.accuracy,
      };
      const lastReception: Reception = {
        firstTouch: action.firstTouch ?? state.firstTouchPlan,
        stance: action.stance ?? state.stancePlan,
      };
      const duration = ballFlightTime(
        holder.position,
        target.position,
        lastPass.velocity,
      );
      const flight: BallFlight = {
        fromId: holder.id,
        toId: target.id,
        start: holder.position,
        end: target.position,
        duration,
        elapsed: 0,
        baseline: {
          homePlayers: state.home.players,
          awayPlayers: state.away.players,
        },
      };
      return {
        ...state,
        ballHolderId: target.id,
        ballPos: holder.position,
        ballFlight: flight,
        lastPass,
        lastReception,
        history: [...state.history, snapshotScene(state)],
      };
    }
    case 'dribble': {
      if (state.ballFlight || state.dribble) return state;
      const holder = state.home.players.find((p) => p.id === state.ballHolderId);
      if (!holder) return state;
      const end = clampPitch(action.targetPos);
      const speed = action.speed ?? DEFAULT_DRIBBLE_SPEED;
      const duration = dribbleDuration(holder.position, end, speed);
      if (duration <= 0) return state;
      const dribble: Dribble = {
        playerId: holder.id,
        start: holder.position,
        end,
        speed,
        duration,
        elapsed: 0,
        baseline: {
          homePlayers: state.home.players,
          awayPlayers: state.away.players,
        },
      };
      return {
        ...state,
        dribble,
        ballPos: holder.position,
        history: [...state.history, snapshotScene(state)],
      };
    }
    case 'advanceTime': {
      if (action.dt <= 0) return state;
      if (state.ballFlight) {
        return advanceFlight(state, state.ballFlight.elapsed + action.dt);
      }
      if (state.dribble) {
        return advanceDribble(state, state.dribble.elapsed + action.dt);
      }
      return state;
    }
    case 'seekFlight': {
      if (state.ballFlight) {
        const p = clamp01(action.progress);
        return advanceFlight(state, p * state.ballFlight.duration);
      }
      if (state.dribble) {
        const p = clamp01(action.progress);
        return advanceDribble(state, p * state.dribble.duration);
      }
      return state;
    }
    case 'skipFlight': {
      if (state.ballFlight) return advanceFlight(state, state.ballFlight.duration);
      if (state.dribble) return advanceDribble(state, state.dribble.duration);
      return state;
    }
    case 'undo': {
      if (state.history.length === 0) return state;
      const last = state.history[state.history.length - 1]!;
      return {
        ...last,
        history: state.history.slice(0, -1),
      };
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

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function clampPitch(p: PitchCoord): PitchCoord {
  return {
    x: p.x < 0 ? 0 : p.x > 100 ? 100 : p.x,
    y: p.y < 0 ? 0 : p.y > 100 ? 100 : p.y,
  };
}

export { createInitialScene };
