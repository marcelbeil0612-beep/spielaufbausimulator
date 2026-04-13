import { describe, it, expect } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import type { Scene } from '@/domain/scene';
import type { FormationPattern } from '@/domain/types';
import type { StartVariant } from '@/domain/startVariants';
import type { PressIntensity } from '@/domain/pressIntensity';
import { evaluate } from './evaluate';
import type { Rating } from './evaluate';
import { reactTo } from './reactTo';
import { simulatePassPreview } from './simulatePassPreview';

const FORMATIONS: readonly FormationPattern[] = ['4-4-2', '4-2-3-1', '5-3-2'];
const PRESS_INTENSITIES: readonly PressIntensity[] = ['high', 'mid', 'low'];
const VARIANTS: readonly StartVariant[] = ['narrow', 'wide', 'high'];

const VALID_RATINGS: readonly Rating[] = [
  'open',
  'pressure',
  'risky',
  'loss-danger',
];

const RATING_ORDER: Record<Rating, number> = {
  open: 0,
  pressure: 1,
  risky: 2,
  'loss-danger': 3,
};

function makeScene(
  formation: FormationPattern,
  intensity: PressIntensity,
  variant: StartVariant,
): Scene {
  return createInitialScene(
    variant,
    'neutral',
    undefined,
    undefined,
    intensity,
    formation,
  );
}

function passToLIV(scene: Scene): Scene {
  const liv = scene.home.players.find((p) => p.role === 'LCB');
  if (!liv) throw new Error('LIV fehlt');
  return reactTo({ ...scene, ballHolderId: liv.id });
}

describe('Didaktik-Matrix Formation × Presshöhe × Startvariante', () => {
  for (const formation of FORMATIONS) {
    for (const intensity of PRESS_INTENSITIES) {
      for (const variant of VARIANTS) {
        const key = `${formation} / ${intensity} / ${variant}`;

        it(`${key}: initial rating ist gültig`, () => {
          const scene = makeScene(formation, intensity, variant);
          expect(VALID_RATINGS).toContain(evaluate(scene));
        });

        it(`${key}: rating nach Pass auf LIV ist gültig`, () => {
          const scene = makeScene(formation, intensity, variant);
          const after = passToLIV(scene);
          expect(VALID_RATINGS).toContain(evaluate(after));
        });

        it(`${key}: preview auf CDM liefert ein gültiges rating`, () => {
          const scene = makeScene(formation, intensity, variant);
          const cdm = scene.home.players.find((p) => p.role === 'CDM');
          if (!cdm) throw new Error('6 fehlt');
          expect(VALID_RATINGS).toContain(
            simulatePassPreview(scene, cdm.id),
          );
        });
      }
    }
  }

  it('high-Press erzeugt mindestens so viel Druck wie low-Press (nach Pass auf LIV)', () => {
    for (const formation of FORMATIONS) {
      for (const variant of VARIANTS) {
        const high = evaluate(passToLIV(makeScene(formation, 'high', variant)));
        const low = evaluate(passToLIV(makeScene(formation, 'low', variant)));
        expect(RATING_ORDER[high]).toBeGreaterThanOrEqual(RATING_ORDER[low]);
      }
    }
  });

  it('mid-Press liegt zwischen low und high (nach Pass auf LIV)', () => {
    for (const formation of FORMATIONS) {
      for (const variant of VARIANTS) {
        const high = evaluate(passToLIV(makeScene(formation, 'high', variant)));
        const mid = evaluate(passToLIV(makeScene(formation, 'mid', variant)));
        const low = evaluate(passToLIV(makeScene(formation, 'low', variant)));
        expect(RATING_ORDER[mid]).toBeGreaterThanOrEqual(RATING_ORDER[low]);
        expect(RATING_ORDER[mid]).toBeLessThanOrEqual(RATING_ORDER[high]);
      }
    }
  });
});
