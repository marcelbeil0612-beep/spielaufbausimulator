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
