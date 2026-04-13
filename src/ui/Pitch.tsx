import type { Player, Team } from '@/domain/types';
import type { Rating } from '@/sim';
import { PITCH_SVG_HEIGHT, PITCH_SVG_WIDTH, toSvgCoord } from './pitchGeometry';
import styles from './Pitch.module.css';

type Props = {
  readonly home: Team;
  readonly away: Team;
  readonly ballHolderId: string;
  readonly rating: Rating;
  readonly previewRatings: Readonly<Record<string, Rating>>;
  readonly onPass: (targetId: string) => void;
};

export function Pitch({
  home,
  away,
  ballHolderId,
  rating,
  previewRatings,
  onPass,
}: Props) {
  const holder =
    home.players.find((p) => p.id === ballHolderId) ??
    away.players.find((p) => p.id === ballHolderId);

  return (
    <div className={styles.wrapper}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${PITCH_SVG_WIDTH} ${PITCH_SVG_HEIGHT}`}
        role="img"
        aria-label="Taktikboard · 4-3-3 gegen 4-4-2 hohes Pressing"
      >
        <PitchLines />

        {away.players.map((player) => (
          <AwayMarker key={player.id} player={player} />
        ))}

        {home.players.map((player) => (
          <HomeMarker
            key={player.id}
            player={player}
            isHolder={player.id === ballHolderId}
            rating={rating}
            previewRating={previewRatings[player.id]}
            onPass={onPass}
          />
        ))}

        {holder ? <Ball position={toSvgCoord(holder.position)} /> : null}
      </svg>
    </div>
  );
}

function AwayMarker({ player }: { readonly player: Player }) {
  const { cx, cy } = toSvgCoord(player.position);
  return (
    <g>
      <circle className={styles.playerAway} cx={cx} cy={cy} r={3.2} />
      <text className={styles.awayLabel} x={cx} y={cy}>
        {player.label}
      </text>
    </g>
  );
}

type HomeMarkerProps = {
  readonly player: Player;
  readonly isHolder: boolean;
  readonly rating: Rating;
  readonly previewRating: Rating | undefined;
  readonly onPass: (targetId: string) => void;
};

const PREVIEW_RING_CLASSES: Record<Rating, string> = {
  open: styles.previewRingOpen,
  pressure: styles.previewRingPressure,
  risky: styles.previewRingRisky,
  'loss-danger': styles.previewRingLoss,
};

const PREVIEW_LABELS: Record<Rating, string> = {
  open: 'offen',
  pressure: 'Druck',
  risky: 'riskant',
  'loss-danger': 'Ballverlust-Gefahr',
};

function HomeMarker({
  player,
  isHolder,
  rating,
  previewRating,
  onPass,
}: HomeMarkerProps) {
  const { cx, cy } = toSvgCoord(player.position);

  if (isHolder) {
    const ringClass =
      rating === 'open'
        ? styles.ringOpen
        : rating === 'pressure'
          ? styles.ringPressure
          : rating === 'risky'
            ? styles.ringRisky
            : styles.ringLoss;
    return (
      <g className={styles.holderGroup}>
        <circle className={ringClass} cx={cx} cy={cy} r={5} />
        <circle className={styles.playerHome} cx={cx} cy={cy} r={3.2} />
        <text className={styles.homeLabel} x={cx} y={cy}>
          {player.label}
        </text>
      </g>
    );
  }

  const handlePass = () => onPass(player.id);
  const previewClass = previewRating
    ? PREVIEW_RING_CLASSES[previewRating]
    : undefined;
  const ariaLabel = previewRating
    ? `Pass an ${player.label} – Vorschau: ${PREVIEW_LABELS[previewRating]}`
    : `Pass an ${player.label}`;

  return (
    <g
      className={styles.homeGroup}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={handlePass}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handlePass();
        }
      }}
    >
      {previewClass ? (
        <circle
          className={`${styles.previewRing} ${previewClass}`}
          cx={cx}
          cy={cy}
          r={5}
        />
      ) : null}
      <circle className={styles.focusRing} cx={cx} cy={cy} r={6.2} />
      <circle className={styles.playerHome} cx={cx} cy={cy} r={3.2} />
      <text className={styles.homeLabel} x={cx} y={cy}>
        {player.label}
      </text>
    </g>
  );
}

function Ball({ position }: { readonly position: { cx: number; cy: number } }) {
  return <circle className={styles.ball} cx={position.cx + 2.4} cy={position.cy - 2.4} r={1.1} />;
}

function PitchLines() {
  return (
    <g>
      <rect
        className={styles.pitch}
        x={0}
        y={0}
        width={PITCH_SVG_WIDTH}
        height={PITCH_SVG_HEIGHT}
      />
      <rect
        className={styles.line}
        x={0}
        y={0}
        width={PITCH_SVG_WIDTH}
        height={PITCH_SVG_HEIGHT}
      />
      <line
        className={styles.line}
        x1={0}
        y1={PITCH_SVG_HEIGHT / 2}
        x2={PITCH_SVG_WIDTH}
        y2={PITCH_SVG_HEIGHT / 2}
      />
      <circle
        className={styles.line}
        cx={PITCH_SVG_WIDTH / 2}
        cy={PITCH_SVG_HEIGHT / 2}
        r={9.15}
      />
      <circle
        className={styles.dot}
        cx={PITCH_SVG_WIDTH / 2}
        cy={PITCH_SVG_HEIGHT / 2}
        r={0.3}
      />
      <rect
        className={styles.line}
        x={13.84}
        y={88.5}
        width={40.32}
        height={16.5}
      />
      <rect
        className={styles.line}
        x={24.84}
        y={99.5}
        width={18.32}
        height={5.5}
      />
      <circle className={styles.dot} cx={34} cy={94} r={0.3} />
      <rect
        className={styles.line}
        x={13.84}
        y={0}
        width={40.32}
        height={16.5}
      />
      <rect
        className={styles.line}
        x={24.84}
        y={0}
        width={18.32}
        height={5.5}
      />
      <circle className={styles.dot} cx={34} cy={11} r={0.3} />
    </g>
  );
}
