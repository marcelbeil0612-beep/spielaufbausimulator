import type { Scene } from './scene';
import { createInitialScene } from './scene';
import type { StartVariant } from './startVariants';
import type { FirstTouch, Stance } from './reception';
import type { PassOptions } from './pass';
import type { PressIntensity } from './pressIntensity';
import type { FormationPattern, PitchCoord } from './types';

/**
 * Eine Szenario-Vorlage = vollständig parametrisierte Start-Szene plus
 * optionale manuelle Spieler-Verschiebungen. Die Szenario-Bibliothek
 * liefert didaktische Lehrfälle, die sich per Klick laden lassen.
 */
export type Scenario = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly build: () => Scene;
};

type ScenarioSpec = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly variant?: StartVariant;
  readonly firstTouch?: FirstTouch;
  readonly stance?: Stance;
  readonly passPlan?: PassOptions;
  readonly pressIntensity?: PressIntensity;
  readonly awayFormation?: FormationPattern;
  /**
   * Manuelle Overrides: Position von Heimspielern mit gegebener Rolle
   * wird auf den angegebenen Wert gesetzt. Wird nach `createInitialScene`
   * angewandt, damit die Formations-Grundausrichtung erhalten bleibt.
   */
  readonly homeMoves?: Readonly<Record<string, PitchCoord>>;
};

function buildScenario(spec: ScenarioSpec): Scenario {
  return {
    id: spec.id,
    label: spec.label,
    description: spec.description,
    build: () => {
      const base = createInitialScene(
        spec.variant,
        spec.firstTouch,
        spec.passPlan,
        spec.stance,
        spec.pressIntensity,
        spec.awayFormation,
      );
      if (!spec.homeMoves) return base;
      const moves = spec.homeMoves;
      return {
        ...base,
        home: {
          ...base.home,
          players: base.home.players.map((p) =>
            moves[p.role] ? { ...p, position: moves[p.role]! } : p,
          ),
        },
      };
    },
  };
}

export const SCENARIOS: readonly Scenario[] = [
  buildScenario({
    id: 'build-up-basic',
    label: 'Spielaufbau Basis',
    description:
      '4-3-3 gegen 4-4-2 hohes Pressing – der Standardfall, an dem der Simulator kalibriert ist.',
  }),
  buildScenario({
    id: 'low-block',
    label: 'Tief stehender Gegner',
    description:
      'Gegner steht in einem 4-4-2 mit niedriger Pressing-Intensität – Räume im Zwischenlinien-Bereich entstehen.',
    variant: 'narrow',
    pressIntensity: 'low',
  }),
  buildScenario({
    id: 'back-five',
    label: 'Gegner mit Dreierkette (5-3-2)',
    description:
      'Gegner im 5-3-2 mit mittlerer Intensität: zwei Stürmer pressen, der Rückraum ist dicht – Außenbahn öffnen.',
    awayFormation: '5-3-2',
    variant: 'wide',
    pressIntensity: 'mid',
  }),
  buildScenario({
    id: 'opponent-4231',
    label: 'Gegner im 4-2-3-1',
    description:
      '4-2-3-1 mit Zehner hinter der Spitze – zentrale Überzahl im Aufbau suchen.',
    awayFormation: '4-2-3-1',
    variant: 'narrow',
    pressIntensity: 'high',
  }),
  buildScenario({
    id: 'switch-play',
    label: 'Umschalten über links',
    description:
      'Variant „Seitenwechsel" mit scharfem Pass – der Außenverteidiger startet aufgerückt, Gegner ballorientiert verschoben.',
    variant: 'switch',
    passPlan: { velocity: 'sharp', accuracy: 'precise' },
    pressIntensity: 'high',
  }),
];

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
