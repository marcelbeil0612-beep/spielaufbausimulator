import type { PitchCoord, Team } from '@/domain/types';
import { getLines } from '@/domain/lines';
import { PRESS_DISTANCE, PRESSURE_RADIUS } from '@/sim';
import { PITCH_SVG_WIDTH, toSvgCoord } from './pitchGeometry';
import styles from './CoachingOverlay.module.css';

type Props = {
  readonly home: Team;
  readonly away: Team;
  readonly ballHolderPos: PitchCoord;
};

/**
 * Nicht-interaktive Lehrschicht: zeichnet zusätzliche didaktische
 * Markierungen auf den Pitch (Linien, Pressing-Radien). Wird außerhalb
 * der Spieler-/Ball-Marker gelayert und hat `pointer-events: none`,
 * damit Drag- und Klickziele unverändert bleiben.
 */
export function CoachingOverlay({ home, away, ballHolderPos }: Props) {
  const awayLines = getLines(away);
  const homeLines = getLines(home);
  const ball = toSvgCoord(ballHolderPos);

  return (
    <g className={styles.overlay} pointerEvents="none">
      <LineBand y={awayLines.defense} label="Abwehr" variant="away" />
      <LineBand y={awayLines.midfield} label="Mittelfeld" variant="away" />
      <LineBand y={awayLines.attack} label="Angriff" variant="away" />

      <LineBand y={homeLines.defense} label="Abwehr" variant="home" />
      <LineBand y={homeLines.midfield} label="Mittelfeld" variant="home" />
      <LineBand y={homeLines.attack} label="Angriff" variant="home" />

      <circle
        className={styles.pressureRadius}
        cx={ball.cx}
        cy={ball.cy}
        r={worldToSvgRadius(PRESSURE_RADIUS)}
      />
      <circle
        className={styles.pressDistance}
        cx={ball.cx}
        cy={ball.cy}
        r={worldToSvgRadius(PRESS_DISTANCE)}
      />
    </g>
  );
}

function LineBand({
  y,
  label,
  variant,
}: {
  readonly y: number;
  readonly label: string;
  readonly variant: 'home' | 'away';
}) {
  if (Number.isNaN(y)) return null;
  const svgY = toSvgCoord({ x: 0, y }).cy;
  const cls =
    variant === 'away' ? styles.awayLineBand : styles.homeLineBand;
  const labelCls =
    variant === 'away' ? styles.awayLineLabel : styles.homeLineLabel;
  return (
    <g>
      <line className={cls} x1={0} y1={svgY} x2={PITCH_SVG_WIDTH} y2={svgY} />
      <text className={labelCls} x={PITCH_SVG_WIDTH - 1} y={svgY - 0.4}>
        {label}
      </text>
    </g>
  );
}

function worldToSvgRadius(world: number): number {
  // Welt-Feld ≈ 100×100 gemapped auf 68×105. Nehme Breitenachse als
  // Referenz für den Radius – leichte Verzerrung in Y-Richtung ist
  // didaktisch akzeptabel.
  return (world / 100) * PITCH_SVG_WIDTH;
}
