import type { PressIntensity } from '@/domain/pressIntensity';

/**
 * Multiplikatoren pro Regel in Abhängigkeit der gegnerischen Presshöhe.
 *
 * Semantik:
 *  - `press`  → Zielabstand Stürmer ↔ Ballträger (PRESS_DISTANCE).
 *    **Größerer Wert = weniger aggressiver Zugriff** (Stürmer bleibt weiter
 *    vom Ball entfernt stehen). `high` drückt daher eng (×1.0 = 8),
 *    `mid` und `low` lockern den Zugriff auf.
 *  - `cover`  → Schrittweite des zweiten Stürmers in Richtung Mitte
 *    (COVER_CENTER_SHIFT).
 *  - `line`   → Rückzug der überspielten Mittelfeldlinie
 *    (LINE_RECOVERY_OFFSET).
 *
 * Für `cover` und `line` folgt die Skala dem Plan (high = 1.0,
 * mid ≈ 0.7, low ≈ 0.4): weniger Intensität ⇒ weniger Verschiebung.
 * `press` wird invertiert skaliert, damit geringere Intensität auch
 * geringeren Zugriff erzeugt (Abstand wächst).
 */
export const PRESS_INTENSITY_FACTORS: Record<
  PressIntensity,
  { readonly press: number; readonly cover: number; readonly line: number }
> = {
  high: { press: 1.0, cover: 1.0, line: 1.0 },
  mid: { press: 1.5, cover: 0.7, line: 0.7 },
  low: { press: 2.5, cover: 0.4, line: 0.4 },
};
