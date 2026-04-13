import type { Scene } from '@/domain/scene';
import type { PassAccuracy, PassVelocity } from '@/domain/pass';
import type { FirstTouch, Stance } from '@/domain/reception';
import { reactTo } from './reactTo';
import type { Rating } from './evaluate';
import { evaluate } from './evaluate';

export type PassPreviewOptions = {
  readonly velocity?: PassVelocity;
  readonly accuracy?: PassAccuracy;
  readonly firstTouch?: FirstTouch;
  readonly stance?: Stance;
};

/**
 * Reine Vorschau: simuliert einen Pass auf `targetId` inkl. Gegner-Reaktion
 * und liefert die resultierende Bewertung zurück, ohne den übergebenen State
 * zu verändern. Ungültiges Ziel oder Pass auf den aktuellen Ballträger fallen
 * auf die Bewertung der aktuellen Szene zurück.
 */
export function simulatePassPreview(
  scene: Scene,
  targetId: string,
  options?: PassPreviewOptions,
): Rating {
  const target = scene.home.players.find((p) => p.id === targetId);
  if (!target) return evaluate(scene);
  if (target.id === scene.ballHolderId) return evaluate(scene);

  const hypothetical: Scene = {
    ...scene,
    ballHolderId: target.id,
    lastPass: {
      velocity: options?.velocity ?? scene.passPlan.velocity,
      accuracy: options?.accuracy ?? scene.passPlan.accuracy,
    },
    lastReception: {
      firstTouch: options?.firstTouch ?? scene.firstTouchPlan,
      stance: options?.stance ?? scene.stancePlan,
    },
  };

  return evaluate(reactTo(hypothetical));
}
