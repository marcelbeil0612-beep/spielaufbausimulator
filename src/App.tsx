import { useEffect, useMemo, useState } from 'react';
import { Lane } from './ui/Lane';
import { Timeline } from './ui/Timeline';
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
  const activeFlight = activeLane.scene.ballFlight;

  useEffect(() => {
    if (activeFlight === null && !playing) setPlaying(true);
  }, [activeFlight, playing]);

  const laneDispatch = useMemo(
    () => (action: SceneAction) =>
      dispatch({ type: 'lane', laneId: activeLane.id, action }),
    [dispatch, activeLane.id],
  );

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
        flight={activeFlight}
        playing={playing}
        onTogglePlay={() => setPlaying((p) => !p)}
        onSeek={(progress) => {
          setPlaying(false);
          laneDispatch({ type: 'seekFlight', progress });
        }}
        onSkip={() => laneDispatch({ type: 'skipFlight' })}
        speed={speed}
        onSpeedChange={setSpeed}
      />

      <Lane lane={activeLane} dispatch={laneDispatch} />

      <p className={styles.hint}>
        Wähle Startvariante, ersten Kontakt, Passschärfe und Passgenauigkeit –
        tippe dann einen Mitspieler, um zu passen. Der Ball fliegt in Echtzeit
        (verlangsamt) – Gegner verschieben nur so weit, wie sie in der Flugzeit
        schaffen. Timeline zum Pausieren, Scrubben und Überspringen.
      </p>
    </main>
  );
}
