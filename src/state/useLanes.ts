import { useEffect, useReducer } from 'react';
import { lanesReducer } from './lanes';
import type { LanesAction, LanesState } from './lanes';
import { loadLanes, saveLanes } from './lanesPersistence';

export type LanesDispatch = (action: LanesAction) => void;

export function useLanes(): {
  state: LanesState;
  dispatch: LanesDispatch;
} {
  const [state, dispatch] = useReducer(lanesReducer, undefined, () =>
    loadLanes(),
  );
  useEffect(() => {
    saveLanes(state);
  }, [state]);
  return { state, dispatch };
}
