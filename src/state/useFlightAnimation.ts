import { useEffect } from 'react';
import type { LanesState } from './lanes';
import type { LanesDispatch } from './useLanes';

/**
 * Treibt laufende Ballflüge und Dribblings über requestAnimationFrame
 * voran. Broadcasted `advanceTime(dt)` an alle Lanes gleichzeitig – Lanes
 * ohne aktive Animation sind in `sceneReducer` No-Ops. Pausiert automatisch,
 * sobald keine Lane mehr eine laufende Animation hat oder `playing`
 * abgeschaltet wird.
 *
 * `speed` ist ein linearer Zeitfaktor (1 = Echtzeit, 0.5 = Slow-Motion).
 */
export function useFlightAnimation(
  state: LanesState,
  dispatch: LanesDispatch,
  playing: boolean,
  speed: number,
): void {
  const anyAnim = state.lanes.some(
    (l) => l.scene.ballFlight !== null || l.scene.dribble !== null,
  );
  const active = playing && anyAnim;
  useEffect(() => {
    if (!active) return;
    let rafId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = ((now - last) / 1000) * speed;
      last = now;
      if (dt > 0) {
        dispatch({
          type: 'broadcast',
          action: { type: 'advanceTime', dt },
        });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [active, dispatch, speed]);
}
