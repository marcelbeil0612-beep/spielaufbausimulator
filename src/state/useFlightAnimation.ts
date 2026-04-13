import { useEffect } from 'react';
import type { Scene } from '@/domain/scene';
import type { SceneDispatch } from './useScene';

/**
 * Treibt einen laufenden Ballflug über requestAnimationFrame voran.
 * Läuft nur, wenn `playing=true` und ein Flug aktiv ist; pausiert
 * automatisch, wenn der Flug endet oder `playing` abgeschaltet wird.
 *
 * `speed` ist ein linearer Zeitfaktor (1 = Echtzeit, 0.5 = Slow-Motion).
 */
export function useFlightAnimation(
  scene: Scene,
  dispatch: SceneDispatch,
  playing: boolean,
  speed: number,
): void {
  const active = playing && scene.ballFlight !== null;
  useEffect(() => {
    if (!active) return;
    let rafId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = ((now - last) / 1000) * speed;
      last = now;
      if (dt > 0) dispatch({ type: 'advanceTime', dt });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [active, dispatch, speed]);
}
