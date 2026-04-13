import type { Scene } from '@/domain/scene';
import {
  pressBallHolder,
  coverCenter,
  compactLine,
  PRESS_DISTANCE,
} from './rules';

/**
 * Komposition aller Reaktions-Regeln. Jede Regel ist eine reine
 * Scene → Scene Funktion; die Ausgabe einer Regel ist die Eingabe der
 * nächsten.
 */
export function reactTo(scene: Scene): Scene {
  return compactLine(coverCenter(pressBallHolder(scene)));
}

export { PRESS_DISTANCE };
