import type { BallFlight } from '@/domain/ballFlight';
import styles from './Timeline.module.css';

type Props = {
  readonly flight: BallFlight | null;
  readonly playing: boolean;
  readonly onTogglePlay: () => void;
  readonly onSeek: (progress: number) => void;
  readonly onSkip: () => void;
  readonly speed: number;
  readonly onSpeedChange: (speed: number) => void;
};

const SPEEDS: readonly number[] = [0.25, 0.5, 1];

export function Timeline({
  flight,
  playing,
  onTogglePlay,
  onSeek,
  onSkip,
  speed,
  onSpeedChange,
}: Props) {
  const hasFlight = flight !== null;
  const progress = flight && flight.duration > 0
    ? flight.elapsed / flight.duration
    : hasFlight ? 1 : 0;
  const clock = flight
    ? `${flight.elapsed.toFixed(2)} / ${flight.duration.toFixed(2)} s`
    : '—';

  return (
    <section className={styles.timeline} aria-label="Ballflug-Zeitachse">
      <span className={styles.label}>Flug</span>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.button}
          onClick={onTogglePlay}
          disabled={!hasFlight}
          aria-label={playing ? 'Pause' : 'Abspielen'}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={onSkip}
          disabled={!hasFlight}
          aria-label="Direkt ans Flugende springen"
        >
          ⏭
        </button>
      </div>
      <input
        className={styles.scrubber}
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={progress}
        disabled={!hasFlight}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label="Ballflug-Fortschritt"
      />
      <span className={styles.clock}>{clock}</span>
      <div className={styles.speed} role="group" aria-label="Abspielgeschwindigkeit">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.speedButton} ${
              s === speed ? styles.speedButtonActive : ''
            }`}
            onClick={() => onSpeedChange(s)}
            aria-pressed={s === speed}
          >
            {s}×
          </button>
        ))}
      </div>
    </section>
  );
}
