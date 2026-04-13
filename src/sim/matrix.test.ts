import { describe, it, expect } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import type { Scene } from '@/domain/scene';
import type { FormationPattern } from '@/domain/types';
import type { StartVariant } from '@/domain/startVariants';
import type { PressIntensity } from '@/domain/pressIntensity';
import type { PassVelocity } from '@/domain/pass';
import { ballFlightTime } from '@/domain/physics';
import { evaluate } from './evaluate';
import type { Rating } from './evaluate';
import { reactTo } from './reactTo';
import { simulatePassPreview } from './simulatePassPreview';

const FORMATIONS: readonly FormationPattern[] = ['4-4-2', '4-2-3-1', '5-3-2'];
const PRESS_INTENSITIES: readonly PressIntensity[] = ['high', 'mid', 'low'];
const VARIANTS: readonly StartVariant[] = ['narrow', 'wide', 'high', 'switch'];

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

const VELOCITIES: readonly PassVelocity[] = ['soft', 'normal', 'sharp'];

function passWithVelocity(
  scene: Scene,
  targetRole: 'LCB' | 'RCB',
  velocity: PassVelocity,
): Scene {
  const holder = scene.home.players.find((p) => p.id === scene.ballHolderId)!;
  const target = scene.home.players.find((p) => p.role === targetRole)!;
  const dt = ballFlightTime(holder.position, target.position, velocity);
  return reactTo({ ...scene, ballHolderId: target.id }, { dt });
}

describe('Spielverlagerung: Passgeschwindigkeit × Distanz', () => {
  for (const formation of FORMATIONS) {
    for (const intensity of PRESS_INTENSITIES) {
      for (const velocity of VELOCITIES) {
        const key = `${formation} / ${intensity} / ${velocity}`;
        it(`${key}: Verlagerung GK→RIV liefert gültiges Rating`, () => {
          const scene = makeScene(formation, intensity, 'switch');
          const after = passWithVelocity(scene, 'RCB', velocity);
          expect(VALID_RATINGS).toContain(evaluate(after));
        });
      }
    }
  }

  it('scharfer Verlagerungspass lässt dem Gegner mindestens so wenig Zeit wie ein weicher', () => {
    for (const formation of FORMATIONS) {
      for (const intensity of PRESS_INTENSITIES) {
        const scene = makeScene(formation, intensity, 'switch');
        const soft = evaluate(passWithVelocity(scene, 'RCB', 'soft'));
        const sharp = evaluate(passWithVelocity(scene, 'RCB', 'sharp'));
        expect(RATING_ORDER[sharp]).toBeLessThanOrEqual(RATING_ORDER[soft]);
      }
    }
  });

  it('normal liegt zwischen soft und sharp (Verlagerung)', () => {
    for (const formation of FORMATIONS) {
      for (const intensity of PRESS_INTENSITIES) {
        const scene = makeScene(formation, intensity, 'switch');
        const soft = evaluate(passWithVelocity(scene, 'RCB', 'soft'));
        const normal = evaluate(passWithVelocity(scene, 'RCB', 'normal'));
        const sharp = evaluate(passWithVelocity(scene, 'RCB', 'sharp'));
        expect(RATING_ORDER[normal]).toBeLessThanOrEqual(RATING_ORDER[soft]);
        expect(RATING_ORDER[normal]).toBeGreaterThanOrEqual(
          RATING_ORDER[sharp],
        );
      }
    }
  });

  it('bei identischem Ziel gibt ein scharfer Pass dem Gegner weniger Bewegungsbudget', () => {
    // Prüft die Physik direkt, unabhängig vom Rating: die Summe der
    // Verteidiger-Bewegung muss mit schnellerem Pass monoton kleiner sein,
    // weil reactTo mit dt=flightTime gekappt wird.
    for (const formation of FORMATIONS) {
      for (const intensity of PRESS_INTENSITIES) {
        const scene = makeScene(formation, intensity, 'switch');
        const shifted = (velocity: PassVelocity): number => {
          const after = passWithVelocity(scene, 'RCB', velocity);
          return after.away.players.reduce((sum, p) => {
            const before = scene.away.players.find((x) => x.id === p.id)!;
            return (
              sum +
              Math.hypot(
                p.position.x - before.position.x,
                p.position.y - before.position.y,
              )
            );
          }, 0);
        };
        expect(shifted('sharp')).toBeLessThanOrEqual(shifted('normal'));
        expect(shifted('normal')).toBeLessThanOrEqual(shifted('soft'));
      }
    }
  });
});
