import { useEffect, useReducer } from 'react';
import type { Scene } from '@/domain/scene';
import { sceneReducer } from './sceneReducer';
import type { SceneAction } from './sceneReducer';
import { loadScene, saveScene } from './persistence';

export type SceneDispatch = (action: SceneAction) => void;

export function useScene(): {
  scene: Scene;
  dispatch: SceneDispatch;
} {
  const [scene, dispatch] = useReducer(sceneReducer, undefined, () => loadScene());
  useEffect(() => {
    saveScene(scene);
  }, [scene]);
  return { scene, dispatch };
}
