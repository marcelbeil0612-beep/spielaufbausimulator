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
 * greift nach oben (cy↓), Gast nach unten (cy↑). Grund-Defaults pro Team;
 * Heim-Marker werden on-the-fly über die `derive…Facing…`-Helfer
 * situativ gedreht. Später koppelbar an Stance/Körperöffnung.
 */
export type FacingVec = { readonly dx: number; readonly dy: number };
export const FACING_HOME: FacingVec = { dx: 0, dy: -1 };
export const FACING_AWAY: FacingVec = { dx: 0, dy: 1 };

/**
 * Bringt einen Vektor auf Länge 1. Zero- bzw. NaN-Vektoren fallen auf
 * `FACING_HOME` zurück, damit der Keil-Renderer nie ein degeneriertes
 * Dreieck bekommt.
 */
export function normalizeFacing(v: FacingVec): FacingVec {
  const len = Math.hypot(v.dx, v.dy);
  if (!Number.isFinite(len) || len < 1e-6) return FACING_HOME;
  return { dx: v.dx / len, dy: v.dy / len };
}

/**
 * Gewichtete Mischung zweier Richtungen. Die Gewichte werden additiv
 * verrechnet und die Summe anschließend normiert – dadurch bleibt das
 * Ergebnis stabil, auch wenn die Gewichte unterschiedlich skaliert sind.
 */
export function mixFacing(
  a: FacingVec,
  wA: number,
  b: FacingVec,
  wB: number,
): FacingVec {
  return normalizeFacing({
    dx: a.dx * wA + b.dx * wB,
    dy: a.dy * wA + b.dy * wB,
  });
}

/**
 * Einheitsvektor von `from` nach `to` in SVG-Raum.
 */
export function facingFromTo(
  from: { cx: number; cy: number },
  to: { cx: number; cy: number },
): FacingVec {
  return normalizeFacing({ dx: to.cx - from.cx, dy: to.cy - from.cy });
}

/**
 * Ballhalter (Heim): grundsätzlich vorwärts, mit kleiner Neigung zur
 * Feldmitte, wenn er auf dem Flügel steht. Halbraum-Gedanke: aus der
 * Mitte lässt sich in beide Seiten weiterspielen – der Körper „zeigt
 * zur Mitte hin offen" statt ans Außenband.
 *
 * Bewusst ohne Sim-Zugriff: der Halbraum-Hinweis reicht didaktisch und
 * vermeidet, dass UI und Bewertungslogik voneinander abhängen.
 */
export function deriveHolderFacingHome(playerSvg: {
  readonly cx: number;
  readonly cy: number;
}): FacingVec {
  const centerX = PITCH_SVG_WIDTH / 2;
  const dx = centerX - playerSvg.cx;
  // Lateraler Lean maximal ~0.4 Einheiten; dy bleibt forward-dominiert.
  const leanX = Math.max(-0.4, Math.min(0.4, dx / 15));
  return normalizeFacing({ dx: leanX, dy: -1 });
}

/**
 * Potenzieller Empfänger (Heim, nicht Ballhalter): „halb offen zum Ball".
 * Mischt Vorwärts mit der Richtung zum Ball, klemmt dy dann so, dass die
 * Vorwärts-Tendenz erhalten bleibt – kein Heimspieler dreht sich komplett
 * zurück, selbst wenn er deutlich vor dem Ball steht.
 *
 * Anschlussfähig: ein späteres Stance-Signal kann hier den Mix-Faktor
 * (0.3) ersetzen (open → 0.45, half-open → 0.3, closed → 0.1) oder den
 * Ergebnis-Vektor zusätzlich rotieren, ohne die Signatur zu ändern.
 */
export function deriveReceiverFacingHome(
  playerSvg: { readonly cx: number; readonly cy: number },
  ballSvg: { readonly cx: number; readonly cy: number },
): FacingVec {
  const toBall = facingFromTo(playerSvg, ballSvg);
  const mixed = mixFacing(FACING_HOME, 0.7, toBall, 0.3);
  // Forward-Klammer: dy darf nie schwächer als -0.3 werden (≈ max ~72° aus
  // der Senkrechten), sonst würde ein weit aufgerückter Spieler sich beim
  // „zum Ball schauen" bildlich umdrehen.
  return normalizeFacing({
    dx: mixed.dx,
    dy: Math.min(mixed.dy, -0.3),
  });
}

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
