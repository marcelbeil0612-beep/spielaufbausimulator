import type { PitchCoord } from '@/domain/types';

/**
 * SVG-Viewbox in Metern (offizielles Fußballfeld).
 * Heim-Tor unten (cy = PITCH_SVG_HEIGHT), Gast-Tor oben (cy = 0).
 */
export const PITCH_SVG_WIDTH = 68;
export const PITCH_SVG_HEIGHT = 105;

/**
 * Mappt Welt-Koordinaten (0..100) auf die SVG-Viewbox.
 * Y wird invertiert, damit das Heim-Tor unten am Bildschirm liegt.
 */
export function toSvgCoord(p: PitchCoord): { cx: number; cy: number } {
  return {
    cx: (p.x / 100) * PITCH_SVG_WIDTH,
    cy: PITCH_SVG_HEIGHT - (p.y / 100) * PITCH_SVG_HEIGHT,
  };
}

/**
 * Spielerabmessungen in SVG-Einheiten. An einer Stelle gebündelt, damit
 * Körper/Ringe/Ball/Labels proportional zueinander bleiben.
 */
export const PLAYER_BODY_R = 2.2;
export const PLAYER_HIT_R = 4.2;
export const PLAYER_RING_R = 3.4;
export const PLAYER_FOCUS_R = 4.4;
export const BALL_R = 0.9;
export const ARROW_INSET = 3.0;
export const LINES_BADGE_R = 1.8;

/**
 * Blick-/Spielrichtung in SVG-Koordinaten (y wächst nach unten). Heim
 * greift nach oben (cy↓), Gast nach unten (cy↑). MVP: teambasiert; später
 * koppelbar an Stance/Körperöffnung (dann echter Winkel statt Konstante).
 */
export type FacingVec = { readonly dx: number; readonly dy: number };
export const FACING_HOME: FacingVec = { dx: 0, dy: -1 };
export const FACING_AWAY: FacingVec = { dx: 0, dy: 1 };

/**
 * Erzeugt die Dreieck-Punkte für die Front-Markierung relativ zum
 * Körpermittelpunkt. Tip sitzt knapp außerhalb des Körperkreises in
 * Blickrichtung, die Basis innerhalb – so schmilzt der Keil optisch mit
 * dem Körper zu einer Tropfenform zusammen.
 */
export function frontWedgePoints(
  cx: number,
  cy: number,
  r: number,
  dir: FacingVec,
): string {
  const px = -dir.dy;
  const py = dir.dx;
  const tipX = cx + dir.dx * (r + 0.8);
  const tipY = cy + dir.dy * (r + 0.8);
  const baseCx = cx + dir.dx * r * 0.3;
  const baseCy = cy + dir.dy * r * 0.3;
  const halfWidth = r * 0.75;
  const blx = baseCx + px * halfWidth;
  const bly = baseCy + py * halfWidth;
  const brx = baseCx - px * halfWidth;
  const bry = baseCy - py * halfWidth;
  return `${tipX},${tipY} ${blx},${bly} ${brx},${bry}`;
}
