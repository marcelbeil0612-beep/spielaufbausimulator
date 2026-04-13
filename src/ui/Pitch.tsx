import type { Player, Team } from '@/domain/types';
import type { LineCount, Rating } from '@/sim';
import { PITCH_SVG_HEIGHT, PITCH_SVG_WIDTH, toSvgCoord } from './pitchGeometry';
import styles from './Pitch.module.css';

type Props = {
  readonly home: Team;
  readonly away: Team;
  readonly ballHolderId: string;
  readonly rating: Rating;
  readonly previewRatings: Readonly<Record<string, Rating>>;
  readonly previewLines: Readonly<Record<string, LineCount>>;
  readonly onPass: (targetId: string) => void;
};

export function Pitch({
  home,
  away,
  ballHolderId,
  rating,
  previewRatings,
  previewLines,
  onPass,
}: Props) {
  const holder =
    home.players.find((p) => p.id === ballHolderId) ??
    away.players.find((p) => p.id === ballHolderId);
  const holderSvg = holder ? toSvgCoord(holder.position) : undefined;

  return (
    <div className={styles.wrapper}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${PITCH_SVG_WIDTH} ${PITCH_SVG_HEIGHT}`}
        role="img"
        aria-label="Taktikboard · 4-3-3 gegen 4-4-2 hohes Pressing"
      >
        <defs>
          <ArrowheadMarker id="arrow-open" cls={styles.arrowOpen} />
          <ArrowheadMarker id="arrow-pressure" cls={styles.arrowPressure} />
          <ArrowheadMarker id="arrow-risky" cls={styles.arrowRisky} />
          <ArrowheadMarker id="arrow-loss" cls={styles.arrowLoss} />
        </defs>

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
            previewLineCount={previewLines[player.id]}
            holderSvg={holderSvg}
            onPass={onPass}
          />
        ))}

        {holderSvg ? <Ball position={holderSvg} /> : null}
      </svg>
    </div>
  );
}

function ArrowheadMarker({ id, cls }: { readonly id: string; readonly cls: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="8"
      refY="5"
      markerWidth="5"
      markerHeight="5"
      orient="auto-start-reverse"
    >
      <path className={cls} d="M0 0 L10 5 L0 10 z" />
    </marker>
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
  readonly previewLineCount: LineCount | undefined;
  readonly holderSvg: { cx: number; cy: number } | undefined;
  readonly onPass: (targetId: string) => void;
};

const PREVIEW_RING_CLASSES: Record<Rating, string> = {
  open: styles.previewRingOpen,
  pressure: styles.previewRingPressure,
  risky: styles.previewRingRisky,
  'loss-danger': styles.previewRingLoss,
};

const ARROW_CLASSES: Record<Rating, string> = {
  open: styles.arrowOpen,
  pressure: styles.arrowPressure,
  risky: styles.arrowRisky,
  'loss-danger': styles.arrowLoss,
};

const ARROW_MARKER_IDS: Record<Rating, string> = {
  open: 'arrow-open',
  pressure: 'arrow-pressure',
  risky: 'arrow-risky',
  'loss-danger': 'arrow-loss',
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
  previewLineCount,
  holderSvg,
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
  const lines = previewLineCount ?? 0;
  const linesSuffix = lines > 0
    ? ` · ${lines} ${lines === 1 ? 'Linie' : 'Linien'} überspielt`
    : '';
  const ariaLabel = previewRating
    ? `Pass an ${player.label} – Vorschau: ${PREVIEW_LABELS[previewRating]}${linesSuffix}`
    : `Pass an ${player.label}${linesSuffix}`;

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
      {holderSvg && previewRating ? (
        <PassArrow
          from={holderSvg}
          to={{ cx, cy }}
          rating={previewRating}
          lines={lines}
        />
      ) : null}
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

function PassArrow({
  from,
  to,
  rating,
  lines,
}: {
  readonly from: { cx: number; cy: number };
  readonly to: { cx: number; cy: number };
  readonly rating: Rating;
  readonly lines: LineCount;
}) {
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  const len = Math.hypot(dx, dy);
  if (len === 0) return null;
  const nx = dx / len;
  const ny = dy / len;
  // Ball und Empfänger-Punkt ausklammern, damit der Pfeil sauber zwischen
  // den Spielerkreisen verläuft (r≈3.2 + Luft).
  const inset = 4.2;
  const x1 = from.cx + nx * inset;
  const y1 = from.cy + ny * inset;
  const x2 = to.cx - nx * inset;
  const y2 = to.cy - ny * inset;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  return (
    <g className={styles.passArrowGroup}>
      <line
        className={`${styles.passArrow} ${ARROW_CLASSES[rating]}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        markerEnd={`url(#${ARROW_MARKER_IDS[rating]})`}
      />
      {lines > 0 ? (
        <g transform={`translate(${mx} ${my})`}>
          <circle className={styles.linesBadge} r={2.4} />
          <text className={styles.linesBadgeLabel} x={0} y={0}>
            {lines}
          </text>
        </g>
      ) : null}
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
