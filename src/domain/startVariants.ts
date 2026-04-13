import type { Team } from './types';

/**
 * Startvariante des Lehrfalls "Pass TW → linker Innenverteidiger".
 *  - `narrow`: LIV steht enger zur Mitte (aktuelle Default-Formation)
 *  - `wide`:   LIV steht breit, näher zur Außenlinie
 *  - `high`:   beide IVs (LIV + RIV) rücken vor – aggressive, hohe
 *              Abwehrlinie mit größerem Abstand zum TW
 *  - `switch`: beide IVs stehen extrem breit (Spielverlagerungs-Fall).
 *              Lehrt den Zusammenhang zwischen Passschärfe und der Zeit,
 *              die der Gegner zum Verschieben hat.
 */
export type StartVariant = 'narrow' | 'wide' | 'high' | 'switch';

export const START_VARIANTS: readonly StartVariant[] = [
  'narrow',
  'wide',
  'high',
  'switch',
] as const;

export const START_VARIANT_LABELS: Record<StartVariant, string> = {
  narrow: 'LIV eng',
  wide: 'LIV breit',
  high: 'IV-Linie hoch',
  switch: 'Verlagerung',
};

type IVOverride = Readonly<Partial<{ x: number; y: number }>>;

/**
 * Pro Variante eine Tabelle mit Positions-Overrides für LCB/RCB.
 * Fehlt ein Feld (x oder y), bleibt der Wert aus der Default-Formation.
 */
const IV_OVERRIDES: Record<
  StartVariant,
  Readonly<{ LCB?: IVOverride; RCB?: IVOverride }>
> = {
  narrow: { LCB: { x: 36 } },
  wide: { LCB: { x: 22 } },
  high: { LCB: { y: 30 }, RCB: { y: 30 } },
  switch: { LCB: { x: 15 }, RCB: { x: 85 } },
};

/**
 * Wendet die Variante auf ein Heimteam an. Nur die IV-Positionen (LCB/RCB)
 * werden angepasst; alle anderen Spieler bleiben unverändert.
 */
export function applyStartVariant(home: Team, variant: StartVariant): Team {
  const overrides = IV_OVERRIDES[variant];
  return {
    ...home,
    players: home.players.map((p) => {
      const o =
        p.role === 'LCB'
          ? overrides.LCB
          : p.role === 'RCB'
            ? overrides.RCB
            : undefined;
      if (!o) return p;
      return {
        ...p,
        position: {
          x: o.x ?? p.position.x,
          y: o.y ?? p.position.y,
        },
      };
    }),
  };
}

export const DEFAULT_START_VARIANT: StartVariant = 'narrow';
