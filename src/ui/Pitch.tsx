import { useCallback, useRef, useState } from 'react';
import type { PitchCoord, Player, Team } from '@/domain/types';
import type { BallFlight } from '@/domain/ballFlight';
import type { Dribble } from '@/domain/dribble';
import type { LineCount, Rating } from '@/sim';
import { PITCH_SVG_HEIGHT, PITCH_SVG_WIDTH, toSvgCoord } from './pitchGeometry';
import styles from './Pitch.module.css';

type Props = {
  readonly home: Team;
  readonly away: Team;
  readonly ballHolderId: string;
  readonly ballPos: PitchCoord;
  readonly ballFlight: BallFlight | null;
  readonly dribble: Dribble | null;
  readonly rating: Rating;
  readonly previewRatings: Readonly<Record<string, Rating>>;
  readonly previewLines: Readonly<Record<string, LineCount>>;
  readonly onPass: (targetId: string) => void;
  readonly onDribble: (targetPos: PitchCoord) => void;
  /**
   * Präfix für SVG-interne IDs (z. B. `<marker>`-Pfeilspitzen), damit
   * mehrere Pitches parallel im Dokument nicht um dieselben IDs kämpfen.
   * Ohne Präfix bleibt das Verhalten identisch zu Single-Pitch.
   */
  readonly idPrefix?: string;
};

type DragState = {
  readonly pointerId: number;
  readonly start: PitchCoord;
  readonly current: PitchCoord;
};

export function Pitch({
  home,
  away,
  ballHolderId,
  ballPos,
  ballFlight,
  dribble,
  rating,
  previewRatings,
  previewLines,
  onPass,
  onDribble,
  idPrefix = '',
}: Props) {
  const holder =
    home.players.find((p) => p.id === ballHolderId) ??
    away.players.find((p) => p.id === ballHolderId);
  const holderSvg = holder ? toSvgCoord(holder.position) : undefined;
  const ballSvg = toSvgCoord(ballPos);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const svgToWorld = useCallback(
    (clientX: number, clientY: number): PitchCoord | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const local = pt.matrixTransform(ctm.inverse());
      return {
        x: (local.x / PITCH_SVG_WIDTH) * 100,
        y: ((PITCH_SVG_HEIGHT - local.y) / PITCH_SVG_HEIGHT) * 100,
      };
    },
    [],
  );

  const animating = ballFlight !== null || dribble !== null;

  const handleHolderPointerDown = (event: React.PointerEvent<SVGElement>) => {
    if (animating) return;
    if (!holder) return;
    const world = svgToWorld(event.clientX, event.clientY);
    if (!world) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      pointerId: event.pointerId,
      start: holder.position,
      current: world,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<SVGElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const world = svgToWorld(event.clientX, event.clientY);
    if (!world) return;
    setDrag({ ...drag, current: world });
  };

  const finishDrag = (event: React.PointerEvent<SVGElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const world = svgToWorld(event.clientX, event.clientY);
    setDrag(null);
    if (!world) return;
    const dx = world.x - drag.start.x;
    const dy = world.y - drag.start.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return;
    onDribble(world);
  };

  return (
    <div className={styles.wrapper}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${PITCH_SVG_WIDTH} ${PITCH_SVG_HEIGHT}`}
        role="img"
        aria-label="Taktikboard · 4-3-3 gegen 4-4-2 hohes Pressing"
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={(event) => {
          if (drag && drag.pointerId === event.pointerId) setDrag(null);
        }}
      >
        <defs>
          <ArrowheadMarker id={`${idPrefix}arrow-open`} cls={styles.arrowOpen} />
          <ArrowheadMarker id={`${idPrefix}arrow-pressure`} cls={styles.arrowPressure} />
          <ArrowheadMarker id={`${idPrefix}arrow-risky`} cls={styles.arrowRisky} />
          <ArrowheadMarker id={`${idPrefix}arrow-loss`} cls={styles.arrowLoss} />
          <ArrowheadMarker id={`${idPrefix}arrow-dribble`} cls={styles.arrowDribble} />
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
            onHolderPointerDown={handleHolderPointerDown}
            draggable={!animating}
            idPrefix={idPrefix}
          />
        ))}

        {ballFlight ? <FlightTrail flight={ballFlight} current={ballSvg} /> : null}
        {dribble ? <DribbleTrail dribble={dribble} current={ballSvg} /> : null}
        {drag ? (
          <DribbleGhost
            from={drag.start}
            to={drag.current}
            idPrefix={idPrefix}
          />
        ) : null}
        <Ball position={ballSvg} nudged={ballFlight === null && dribble === null} />
      </svg>
    </div>
  );
}

function FlightTrail({
  flight,
  current,
}: {
  readonly flight: BallFlight;
  readonly current: { cx: number; cy: number };
}) {
  const from = toSvgCoord(flight.start);
  const to = toSvgCoord(flight.end);
  return (
    <g className={styles.flightGroup}>
      <line
        className={styles.flightLane}
        x1={from.cx}
        y1={from.cy}
        x2={to.cx}
        y2={to.cy}
      />
      <line
        className={styles.flightTrail}
        x1={from.cx}
        y1={from.cy}
        x2={current.cx}
        y2={current.cy}
      />
    </g>
  );
}

function DribbleTrail({
  dribble,
  current,
}: {
  readonly dribble: Dribble;
  readonly current: { cx: number; cy: number };
}) {
  const from = toSvgCoord(dribble.start);
  const to = toSvgCoord(dribble.end);
  return (
    <g className={styles.flightGroup}>
      <line
        className={styles.dribbleLane}
        x1={from.cx}
        y1={from.cy}
        x2={to.cx}
        y2={to.cy}
      />
      <line
        className={styles.dribbleTrail}
        x1={from.cx}
        y1={from.cy}
        x2={current.cx}
        y2={current.cy}
      />
    </g>
  );
}

function DribbleGhost({
  from,
  to,
  idPrefix,
}: {
  readonly from: PitchCoord;
  readonly to: PitchCoord;
  readonly idPrefix: string;
}) {
  const f = toSvgCoord(from);
  const t = toSvgCoord(to);
  const dx = t.cx - f.cx;
  const dy = t.cy - f.cy;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return null;
  const nx = dx / len;
  const ny = dy / len;
  const inset = 4.2;
  const x1 = f.cx + nx * inset;
  const y1 = f.cy + ny * inset;
  const x2 = t.cx;
  const y2 = t.cy;
  return (
    <g className={styles.dribbleGhostGroup} pointerEvents="none">
      <line
        className={styles.dribbleGhost}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        markerEnd={`url(#${idPrefix}arrow-dribble)`}
      />
      <circle className={styles.dribbleTarget} cx={t.cx} cy={t.cy} r={2.2} />
    </g>
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
  readonly onHolderPointerDown: (event: React.PointerEvent<SVGElement>) => void;
  readonly draggable: boolean;
  readonly idPrefix: string;
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
  onHolderPointerDown,
  draggable,
  idPrefix,
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
    const handlePointerDown = draggable
      ? (event: React.PointerEvent<SVGElement>) => {
          event.stopPropagation();
          onHolderPointerDown(event);
        }
      : undefined;
    const ariaLabel = draggable
      ? `${player.label} (Ballhalter, ziehen zum Dribbeln)`
      : `${player.label} (Ballhalter)`;
    return (
      <g
        className={`${styles.holderGroup} ${draggable ? styles.holderDraggable : ''}`}
        aria-label={ariaLabel}
        onPointerDown={handlePointerDown}
      >
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
          idPrefix={idPrefix}
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
  idPrefix,
}: {
  readonly from: { cx: number; cy: number };
  readonly to: { cx: number; cy: number };
  readonly rating: Rating;
  readonly lines: LineCount;
  readonly idPrefix: string;
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
        markerEnd={`url(#${idPrefix}${ARROW_MARKER_IDS[rating]})`}
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

function Ball({
  position,
  nudged,
}: {
  readonly position: { cx: number; cy: number };
  readonly nudged: boolean;
}) {
  const dx = nudged ? 2.4 : 0;
  const dy = nudged ? -2.4 : 0;
  return (
    <circle
      className={styles.ball}
      cx={position.cx + dx}
      cy={position.cy + dy}
      r={1.1}
    />
  );
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
