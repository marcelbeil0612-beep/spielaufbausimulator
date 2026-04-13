import type { Team } from './types';

/**
 * Startvariante des Lehrfalls "Pass TW → linker Innenverteidiger".
 *  - `narrow`: LIV steht enger zur Mitte (aktuelle Default-Formation)
 *  - `wide`:   LIV steht breit, näher zur Außenlinie
 */
export type StartVariant = 'narrow' | 'wide';

export const START_VARIANTS: readonly StartVariant[] = [
  'narrow',
  'wide',
] as const;

export const START_VARIANT_LABELS: Record<StartVariant, string> = {
  narrow: 'LIV eng',
  wide: 'LIV breit',
};

/**
 * X-Koordinate des LIV pro Variante. Y bleibt unverändert, damit die
 * Abwehrlinie auf gleicher Höhe bleibt und nur die Breitenstellung variiert.
 */
const LCB_X_BY_VARIANT: Record<StartVariant, number> = {
  narrow: 36,
  wide: 22,
};

/**
 * Wendet die Variante auf ein Heimteam an. Nur die Position des LIV (`LCB`)
 * wird angepasst; alle anderen Spieler bleiben unverändert.
 */
export function applyStartVariant(home: Team, variant: StartVariant): Team {
  const targetX = LCB_X_BY_VARIANT[variant];
  return {
    ...home,
    players: home.players.map((p) =>
      p.role === 'LCB'
        ? { ...p, position: { x: targetX, y: p.position.y } }
        : p,
    ),
  };
}

export const DEFAULT_START_VARIANT: StartVariant = 'narrow';
