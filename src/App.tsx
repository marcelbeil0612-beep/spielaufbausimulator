import { useEffect, useMemo, useState } from 'react';
import { Lane } from './ui/Lane';
import { ScenarioPicker } from './ui/ScenarioPicker';
import { Timeline } from './ui/Timeline';
import type { AnimationState } from './ui/Timeline';
import { useLanes, useFlightAnimation } from './state';
import type { SceneAction } from './state';
import styles from './App.module.css';

export function App() {
  const { state, dispatch } = useLanes();
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(0.5);
  useFlightAnimation(state, dispatch, playing, speed);

  const activeLane =
    state.lanes.find((l) => l.id === state.activeLaneId) ?? state.lanes[0]!;
  const activeAnim: AnimationState | null = useMemo(() => {
    if (activeLane.scene.ballFlight) {
      return {
        kind: 'flight',
        elapsed: activeLane.scene.ballFlight.elapsed,
        duration: activeLane.scene.ballFlight.duration,
      };
    }
    if (activeLane.scene.dribble) {
      return {
        kind: 'dribble',
        elapsed: activeLane.scene.dribble.elapsed,
        duration: activeLane.scene.dribble.duration,
      };
    }
    return null;
  }, [activeLane.scene.ballFlight, activeLane.scene.dribble]);

  useEffect(() => {
    if (activeAnim === null && !playing) setPlaying(true);
  }, [activeAnim, playing]);

  const canRemove = state.lanes.length > 1;
  const laneCount = state.lanes.length;

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Spielaufbau-Simulator</h1>
        <p className={styles.subtitle}>
          Lehrfall: 4-3-3 gegen 4-4-2 hohes Pressing · Pass TW → linker
          Innenverteidiger
        </p>
      </header>

      <Timeline
        animation={activeAnim}
        playing={playing}
        onTogglePlay={() => setPlaying((p) => !p)}
        onSeek={(progress) => {
          setPlaying(false);
          dispatch({
            type: 'lane',
            laneId: activeLane.id,
            action: { type: 'seekFlight', progress },
          });
        }}
        onSkip={() =>
          dispatch({
            type: 'lane',
            laneId: activeLane.id,
            action: { type: 'skipFlight' },
          })
        }
        speed={speed}
        onSpeedChange={setSpeed}
      />

      <section
        className={styles.lanes}
        data-count={Math.min(laneCount, 3)}
        aria-label="Vergleichs-Lanes"
      >
        {state.lanes.map((lane) => {
          const laneDispatch = (action: SceneAction) =>
            dispatch({ type: 'lane', laneId: lane.id, action });
          return (
            <Lane
              key={lane.id}
              lane={lane}
              dispatch={laneDispatch}
              isActive={lane.id === state.activeLaneId}
              onActivate={() =>
                dispatch({ type: 'setActiveLane', laneId: lane.id })
              }
              onRemove={
                canRemove
                  ? () => dispatch({ type: 'removeLane', laneId: lane.id })
                  : undefined
              }
            />
          );
        })}
      </section>

      <section className={styles.toolbar} aria-label="Lane-Verwaltung">
        <button
          type="button"
          className={styles.addButton}
          onClick={() => dispatch({ type: 'addLane' })}
          disabled={laneCount >= 4}
          aria-label="Neue Vergleichs-Lane hinzufügen"
        >
          + Lane (Kopie der aktiven)
        </button>
        <ScenarioPicker
          onLoad={(scenarioId) =>
            dispatch({
              type: 'lane',
              laneId: activeLane.id,
              action: { type: 'loadScenario', scenarioId },
            })
          }
        />
        <span className={styles.laneCount}>
          {laneCount === 1 ? '1 Lane' : `${laneCount} Lanes`}
        </span>
      </section>

      <p className={styles.hint}>
        Wähle Startvariante, ersten Kontakt, Passschärfe und Passgenauigkeit –
        tippe dann einen Mitspieler, um zu passen, oder ziehe den Ballhalter
        auf eine freie Fläche, um zu dribbeln. Der Ball fliegt bzw. der Dribbler
        läuft in Echtzeit (verlangsamt) – Gegner verschieben nur so weit, wie
        sie in der Dauer schaffen. Timeline steuert die aktive Lane; Play gilt
        für alle Lanes synchron, damit man den Unterschied im selben Moment
        sieht.
      </p>
    </main>
  );
}
