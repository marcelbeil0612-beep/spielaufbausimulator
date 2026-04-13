import type { Scene } from '@/domain/scene';
import { createInitialScene } from '@/domain/scene';
import { sceneReducer } from './sceneReducer';
import type { SceneAction } from './sceneReducer';

/**
 * Eine einzelne Szene plus stabile Lane-ID. Mehrere Lanes laufen parallel
 * nebeneinander (Split-Screen-Vergleich: z. B. "narrow" links vs "wide"
 * rechts). Player-IDs dürfen sich zwischen Lanes überlappen – sie sind
 * lane-lokal und kollidieren in keinem Render-Kontext.
 */
export type Lane = {
  readonly id: string;
  readonly scene: Scene;
};

export type LanesState = {
  readonly lanes: readonly Lane[];
  readonly activeLaneId: string;
};

export type LanesAction =
  | {
      readonly type: 'lane';
      readonly laneId: string;
      readonly action: SceneAction;
    }
  | { readonly type: 'broadcast'; readonly action: SceneAction }
  | { readonly type: 'addLane'; readonly sourceLaneId?: string }
  | { readonly type: 'removeLane'; readonly laneId: string }
  | { readonly type: 'setActiveLane'; readonly laneId: string };

export function createInitialLanesState(scene?: Scene): LanesState {
  const initial = scene ?? createInitialScene();
  const id = 'lane-1';
  return { lanes: [{ id, scene: initial }], activeLaneId: id };
}

export function lanesReducer(
  state: LanesState,
  action: LanesAction,
): LanesState {
  switch (action.type) {
    case 'lane': {
      const idx = state.lanes.findIndex((l) => l.id === action.laneId);
      if (idx === -1) return state;
      const current = state.lanes[idx]!;
      const next = sceneReducer(current.scene, action.action);
      if (next === current.scene) return state;
      const lanes = state.lanes.map((l, i) =>
        i === idx ? { ...l, scene: next } : l,
      );
      return { ...state, lanes };
    }
    case 'broadcast': {
      let changed = false;
      const lanes = state.lanes.map((l) => {
        const next = sceneReducer(l.scene, action.action);
        if (next === l.scene) return l;
        changed = true;
        return { ...l, scene: next };
      });
      return changed ? { ...state, lanes } : state;
    }
    case 'addLane': {
      const sourceId = action.sourceLaneId ?? state.activeLaneId;
      const source = state.lanes.find((l) => l.id === sourceId);
      const scene = source ? cloneScene(source.scene) : createInitialScene();
      const id = nextLaneId(state);
      return {
        ...state,
        lanes: [...state.lanes, { id, scene }],
        activeLaneId: id,
      };
    }
    case 'removeLane': {
      if (state.lanes.length <= 1) return state;
      const idx = state.lanes.findIndex((l) => l.id === action.laneId);
      if (idx === -1) return state;
      const lanes = state.lanes.filter((l) => l.id !== action.laneId);
      const activeLaneId =
        state.activeLaneId === action.laneId
          ? lanes[Math.max(0, idx - 1)]!.id
          : state.activeLaneId;
      return { lanes, activeLaneId };
    }
    case 'setActiveLane': {
      if (state.activeLaneId === action.laneId) return state;
      if (!state.lanes.some((l) => l.id === action.laneId)) return state;
      return { ...state, activeLaneId: action.laneId };
    }
  }
}

function nextLaneId(state: LanesState): string {
  const existing = new Set(state.lanes.map((l) => l.id));
  let n = state.lanes.length + 1;
  while (existing.has(`lane-${n}`)) n++;
  return `lane-${n}`;
}

function cloneScene(scene: Scene): Scene {
  return {
    ...scene,
    home: { ...scene.home, players: [...scene.home.players] },
    away: { ...scene.away, players: [...scene.away.players] },
  };
}
