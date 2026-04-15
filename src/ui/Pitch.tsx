import { useCallback, useRef, useState } from 'react';
import type { PitchCoord, Player, Team } from '@/domain/types';
import type { BallFlight } from '@/domain/ballFlight';
import type { Dribble } from '@/domain/dribble';
import type { LineCount, Rating, SuggestedMove } from '@/sim';
import { CoachingOverlay } from './CoachingOverlay';
import {
  ARROW_INSET,
  BALL_R,
  FACING_AWAY,
  LINES_BADGE_R,
  PITCH_SVG_HEIGHT,
  PITCH_SVG_WIDTH,
  PLAYER_BODY_R,
  PLAYER_FOCUS_R,
  PLAYER_HIT_R,
  PLAYER_RING_R,
  deriveHolderFacingHome,
  deriveReceiverFacingHome,
  frontWedgePoints,
  toSvgCoord,
} from './pitchGeometry';
import type { FacingVec } from './pitchGeometry';
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
  readonly onMovePlayer: (playerId: string, position: PitchCoord) => void;
  readonly editMode: boolean;
  readonly coachingOverlay: boolean;
  readonly suggestions?: readonly SuggestedMove[];
  readonly onApplySuggestion?: (suggestion: SuggestedMove) => void;
  /**
   * Präfix für SVG-interne IDs (z. B. `<marker>`-Pfeilspitzen), damit
   * mehrere Pitches parallel im Dokument nicht um dieselben IDs kämpfen.
   * Ohne Präfix bleibt das Verhalten identisch zu Single-Pitch.
   */
  readonly idPrefix?: string;
};

type DragKind = 'dribble' | 'move';

type DragState = {
  readonly pointerId: number;
  readonly playerId: string;
  readonly kind: DragKind;
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
  onMovePlayer,
  editMode,
  coachingOverlay,
  suggestions,
  onApplySuggestion,
  idPrefix = '',
}: Props) {
  const holder =
    home.players.find((p) => p.id === ballHolderId) ??
    away.players.find((p) => p.id === ballHolderId);
  const holderSvg = holder ? toSvgCoord(holder.position) : undefined;
  const ballSvg = toSvgCoord(ballPos);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  // Touch-Fallback für die Hover-Vorschau: beim ersten Tap wird das Ziel
  // nur angeheftet (sticky preview), erst der zweite Tap auf denselben
  // Spieler committet den Pass. Maus/Stift bleiben unverändert (1 Klick).
  const [stickyPreviewId, setStickyPreviewId] = useState<string | null>(null);

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
  const ballStillTraveling =
    ballFlight !== null && ballFlight.elapsed < ballFlight.travelDuration;

  const handlePlayerPointerDown = (
    playerId: string,
    origin: PitchCoord,
    kind: DragKind,
  ) =>
    (event: React.PointerEvent<SVGElement>) => {
      if (animating) return;
      const world = svgToWorld(event.clientX, event.clientY);
      if (!world) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({
        pointerId: event.pointerId,
        playerId,
        kind,
        start: origin,
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
    const captured = drag;
    setDrag(null);
    if (!world) return;
    const dx = world.x - captured.start.x;
    const dy = world.y - captured.start.y;
    const dist = Math.hypot(dx, dy);
    if (captured.kind === 'move') {
      if (dist < 0.5) return;
      onMovePlayer(captured.playerId, world);
      return;
    }
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

        {coachingOverlay ? (
          <CoachingOverlay home={home} away={away} ballHolderPos={ballPos} />
        ) : null}

        {away.players.map((player) => (
          <AwayMarker
            key={player.id}
            player={player}
            editMode={editMode && !animating}
            onEditPointerDown={handlePlayerPointerDown(
              player.id,
              player.position,
              'move',
            )}
          />
        ))}

        {home.players.map((player) => {
          const isHolder = player.id === ballHolderId;
          const holderDragKind: DragKind = editMode ? 'move' : 'dribble';
          const playerSvg = toSvgCoord(player.position);
          const facing = isHolder
            ? deriveHolderFacingHome(playerSvg)
            : deriveReceiverFacingHome(playerSvg, ballSvg);
          return (
            <HomeMarker
              key={player.id}
              player={player}
              isHolder={isHolder}
              rating={rating}
              previewRating={previewRatings[player.id]}
              previewLineCount={previewLines[player.id]}
              holderSvg={holderSvg}
              editMode={editMode}
              facing={facing}
              onPass={(id) => {
                setStickyPreviewId(null);
                onPass(id);
              }}
              stickyPreview={stickyPreviewId === player.id}
              onRequestStickyPreview={(id) => setStickyPreviewId(id)}
              onHolderPointerDown={handlePlayerPointerDown(
                player.id,
                player.position,
                holderDragKind,
              )}
              onEditPointerDown={handlePlayerPointerDown(
                player.id,
                player.position,
                'move',
              )}
              draggable={!animating}
              idPrefix={idPrefix}
            />
          );
        })}

        {suggestions && suggestions.length > 0
          ? suggestions.map((s, i) => (
              <SuggestionGhost
                key={s.code}
                suggestion={s}
                variant={i === 0 ? 'primary' : 'alternate'}
                onApply={onApplySuggestion}
              />
            ))
          : null}
        {ballStillTraveling && ballFlight ? (
          <FlightTrail flight={ballFlight} current={ballSvg} />
        ) : null}
        {dribble ? <DribbleTrail dribble={dribble} current={ballSvg} /> : null}
        {drag ? (
          drag.kind === 'dribble' ? (
            <DribbleGhost
              from={drag.start}
              to={drag.current}
              idPrefix={idPrefix}
            />
          ) : (
            <MoveGhost from={drag.start} to={drag.current} />
          )
        ) : null}
        <Ball position={ballSvg} nudged={!ballStillTraveling && dribble === null} />
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

function MoveGhost({
  from,
  to,
}: {
  readonly from: PitchCoord;
  readonly to: PitchCoord;
}) {
  const f = toSvgCoord(from);
  const t = toSvgCoord(to);
  return (
    <g className={styles.dribbleGhostGroup} pointerEvents="none">
      <line
        className={styles.moveGhost}
        x1={f.cx}
        y1={f.cy}
        x2={t.cx}
        y2={t.cy}
      />
      <circle className={styles.moveTarget} cx={t.cx} cy={t.cy} r={1.8} />
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
  const x1 = f.cx + nx * ARROW_INSET;
  const y1 = f.cy + ny * ARROW_INSET;
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
      <circle className={styles.dribbleTarget} cx={t.cx} cy={t.cy} r={1.6} />
    </g>
  );
}


function SuggestionGhost({
  suggestion,
  variant,
  onApply,
}: {
  readonly suggestion: SuggestedMove;
  readonly variant: 'primary' | 'alternate';
  readonly onApply?: ((s: SuggestedMove) => void) | undefined;
}) {
  const from = toSvgCoord(suggestion.from);
  const to = toSvgCoord(suggestion.to);
  const handleActivate = (event: React.SyntheticEvent) => {
    event.stopPropagation();
    onApply?.(suggestion);
  };
  const groupClass =
    variant === 'primary'
      ? `${styles.suggestionGhostGroup} ${styles.suggestionGhostPrimary}`
      : `${styles.suggestionGhostGroup} ${styles.suggestionGhostAlternate}`;
  const label =
    variant === 'primary'
      ? `Beste Empfehlung übernehmen: ${suggestion.title}`
      : `Alternative übernehmen: ${suggestion.title}`;
  return (
    <g
      className={groupClass}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleActivate(event);
        }
      }}
    >
      <line
        className={styles.suggestionGhostLine}
        x1={from.cx}
        y1={from.cy}
        x2={to.cx}
        y2={to.cy}
      />
      <circle
        className={styles.suggestionGhostTarget}
        cx={to.cx}
        cy={to.cy}
        r={variant === 'primary' ? 2.6 : 2.0}
      />
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

function AwayMarker({
  player,
  editMode,
  onEditPointerDown,
}: {
  readonly player: Player;
  readonly editMode: boolean;
  readonly onEditPointerDown: (event: React.PointerEvent<SVGElement>) => void;
}) {
  const { cx, cy } = toSvgCoord(player.position);
  const handler = editMode
    ? (event: React.PointerEvent<SVGElement>) => {
        event.stopPropagation();
        onEditPointerDown(event);
      }
    : undefined;
  return (
    <g
      className={editMode ? styles.awayGroupEditable : undefined}
      aria-label={
        editMode ? `${player.label} verschieben` : player.label
      }
      onPointerDown={handler}
    >
      <circle className={styles.hitArea} cx={cx} cy={cy} r={PLAYER_HIT_R} />
      <PlayerBody cx={cx} cy={cy} dir={FACING_AWAY} team="away" />
      <text className={styles.awayLabel} x={cx} y={cy}>
        {player.label}
      </text>
    </g>
  );
}

/**
 * Gemeinsamer Spieler-Korpus: Front-Keil in Blickrichtung + Kreis-Körper.
 * Der Keil wird zuerst gezeichnet und vom Kreis halb überlappt, sodass
 * eine ruhige Tropfensilhouette entsteht. Im Prop-Namen steckt bereits
 * die spätere Andockstelle (`dir` als Vektor) für Stance-/Erst-Kontakt-
 * Rotation.
 */
function PlayerBody({
  cx,
  cy,
  dir,
  team,
}: {
  readonly cx: number;
  readonly cy: number;
  readonly dir: FacingVec;
  readonly team: 'home' | 'away';
}) {
  const bodyClass = team === 'home' ? styles.playerHome : styles.playerAway;
  const frontClass =
    team === 'home' ? styles.playerFrontHome : styles.playerFrontAway;
  const points = frontWedgePoints(cx, cy, PLAYER_BODY_R, dir);
  return (
    <>
      <polygon className={frontClass} points={points} />
      <circle className={bodyClass} cx={cx} cy={cy} r={PLAYER_BODY_R} />
    </>
  );
}

type HomeMarkerProps = {
  readonly player: Player;
  readonly isHolder: boolean;
  readonly rating: Rating;
  readonly previewRating: Rating | undefined;
  readonly previewLineCount: LineCount | undefined;
  readonly holderSvg: { cx: number; cy: number } | undefined;
  readonly editMode: boolean;
  readonly facing: FacingVec;
  readonly onPass: (targetId: string) => void;
  readonly stickyPreview: boolean;
  readonly onRequestStickyPreview: (targetId: string) => void;
  readonly onHolderPointerDown: (event: React.PointerEvent<SVGElement>) => void;
  readonly onEditPointerDown: (event: React.PointerEvent<SVGElement>) => void;
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
  editMode,
  facing,
  onPass,
  stickyPreview,
  onRequestStickyPreview,
  onHolderPointerDown,
  onEditPointerDown,
  draggable,
  idPrefix,
}: HomeMarkerProps) {
  const { cx, cy } = toSvgCoord(player.position);
  // Letzter Eingabetyp dieses Markers – für Tap-to-preview auf Touch.
  // Mouse/Pen dürfen weiterhin sofort passen (Hover-Vorschau).
  const lastPointerTypeRef = useRef<string>('mouse');

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
    const ariaLabel = editMode
      ? `${player.label} (Ballhalter, ziehen zum Verschieben)`
      : draggable
        ? `${player.label} (Ballhalter, ziehen zum Dribbeln)`
        : `${player.label} (Ballhalter)`;
    return (
      <g
        className={`${styles.holderGroup} ${draggable ? styles.holderDraggable : ''}`}
        aria-label={ariaLabel}
        onPointerDown={handlePointerDown}
      >
        <circle className={styles.hitArea} cx={cx} cy={cy} r={PLAYER_HIT_R} />
        <circle className={ringClass} cx={cx} cy={cy} r={PLAYER_RING_R} />
        <PlayerBody cx={cx} cy={cy} dir={facing} team="home" />
        <text className={styles.homeLabel} x={cx} y={cy}>
          {player.label}
        </text>
      </g>
    );
  }

  if (editMode) {
    const handleEditPointerDown = draggable
      ? (event: React.PointerEvent<SVGElement>) => {
          event.stopPropagation();
          onEditPointerDown(event);
        }
      : undefined;
    return (
      <g
        className={`${styles.homeGroup} ${styles.holderDraggable}`}
        aria-label={`${player.label} verschieben`}
        onPointerDown={handleEditPointerDown}
      >
        <circle className={styles.hitArea} cx={cx} cy={cy} r={PLAYER_HIT_R} />
        <PlayerBody cx={cx} cy={cy} dir={facing} team="home" />
        <text className={styles.homeLabel} x={cx} y={cy}>
          {player.label}
        </text>
      </g>
    );
  }

  const handleActivate = () => {
    // Auf Touch: erster Tap heftet die Vorschau an, zweiter Tap auf denselben
    // Spieler committet. Auf Maus/Stift direkt passen – unverändertes Desktop-Verhalten.
    if (lastPointerTypeRef.current === 'touch' && !stickyPreview) {
      onRequestStickyPreview(player.id);
      return;
    }
    onPass(player.id);
  };
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
      className={`${styles.homeGroup} ${stickyPreview ? styles.homeGroupPreviewActive : ''}`}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={stickyPreview || undefined}
      onPointerDown={(event) => {
        lastPointerTypeRef.current = event.pointerType;
      }}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPass(player.id);
        }
      }}
    >
      <circle className={styles.hitArea} cx={cx} cy={cy} r={PLAYER_HIT_R} />
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
          r={PLAYER_RING_R}
        />
      ) : null}
      <circle className={styles.focusRing} cx={cx} cy={cy} r={PLAYER_FOCUS_R} />
      <PlayerBody cx={cx} cy={cy} dir={facing} team="home" />
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
  // Ball und Empfänger-Punkt ausklammern, damit der Pfeil zwischen den
  // Körperkreisen verläuft; Inset ist an PLAYER_BODY_R + Luft gekoppelt.
  const x1 = from.cx + nx * ARROW_INSET;
  const y1 = from.cy + ny * ARROW_INSET;
  const x2 = to.cx - nx * ARROW_INSET;
  const y2 = to.cy - ny * ARROW_INSET;
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
          <circle className={styles.linesBadge} r={LINES_BADGE_R} />
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
  // Offset so the ball sits neben dem Ballhalter, nicht in ihm.
  const dx = nudged ? PLAYER_BODY_R * 0.85 : 0;
  const dy = nudged ? -PLAYER_BODY_R * 0.85 : 0;
  return (
    <circle
      className={styles.ball}
      cx={position.cx + dx}
      cy={position.cy + dy}
      r={BALL_R}
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
