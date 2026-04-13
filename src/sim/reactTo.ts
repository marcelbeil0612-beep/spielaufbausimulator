import type { Scene } from '@/domain/scene';
import {
  pressBallHolder,
  coverCenter,
  compactLine,
  PRESS_DISTANCE,
} from './rules';

/**
 * Optionen für `reactTo`. Ohne Argument verhält sich die Simulation wie
 * vor der Zeit-Axis: jede Regel erreicht ihren Zielzustand in einem Schritt
 * (semantisch: „Endbild der Reaktion"). Mit `dt` werden die Verschiebungen
 * jeder Regel durch `maxShiftDistance(dt, role)` gekappt – das ist die
 * Grundlage für Ballflug-Animation und Scrubbing.
 */
export type ReactOptions = {
  readonly dt?: number;
};

/**
 * Komposition aller Reaktions-Regeln. Jede Regel ist eine reine
 * Scene → Scene Funktion; die Ausgabe einer Regel ist die Eingabe der
 * nächsten.
 */
export function reactTo(scene: Scene, options?: ReactOptions): Scene {
  return compactLine(
    coverCenter(pressBallHolder(scene, options), options),
    options,
  );
}

export { PRESS_DISTANCE };
