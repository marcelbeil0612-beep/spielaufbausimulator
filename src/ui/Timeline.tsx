import styles from './Timeline.module.css';

export type AnimationState = {
  readonly kind: 'flight' | 'dribble';
  readonly elapsed: number;
  readonly duration: number;
};

type Props = {
  readonly animation: AnimationState | null;
  readonly playing: boolean;
  readonly onTogglePlay: () => void;
  readonly onSeek: (progress: number) => void;
  readonly onSkip: () => void;
  readonly speed: number;
  readonly onSpeedChange: (speed: number) => void;
};

const SPEEDS: readonly number[] = [0.25, 0.5, 1];

const LABELS: Record<AnimationState['kind'], string> = {
  flight: 'Flug',
  dribble: 'Dribbling',
};

export function Timeline({
  animation,
  playing,
  onTogglePlay,
  onSeek,
  onSkip,
  speed,
  onSpeedChange,
}: Props) {
  const hasAnim = animation !== null;
  const progress = animation && animation.duration > 0
    ? animation.elapsed / animation.duration
    : hasAnim ? 1 : 0;
  const clock = animation
    ? `${animation.elapsed.toFixed(2)} / ${animation.duration.toFixed(2)} s`
    : '—';
  const label = animation ? LABELS[animation.kind] : 'Animation';

  return (
    <section className={styles.timeline} aria-label="Animations-Zeitachse">
      <span className={styles.label}>{label}</span>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.button}
          onClick={onTogglePlay}
          disabled={!hasAnim}
          aria-label={playing ? 'Pause' : 'Abspielen'}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={onSkip}
          disabled={!hasAnim}
          aria-label="Direkt ans Animationsende springen"
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
        disabled={!hasAnim}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label="Animations-Fortschritt"
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
