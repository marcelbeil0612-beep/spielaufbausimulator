import { Pitch } from './Pitch';
import { RatingBadge } from './RatingBadge';
import { VariantPicker } from './VariantPicker';
import { FirstTouchPicker } from './FirstTouchPicker';
import { PassVelocityPicker } from './PassVelocityPicker';
import { PassAccuracyPicker } from './PassAccuracyPicker';
import { StancePicker } from './StancePicker';
import { OpponentPicker } from './OpponentPicker';
import { PressIntensityPicker } from './PressIntensityPicker';
import { explainRating, linesBroken, simulatePassPreview } from '@/sim';
import type { LineCount, Rating } from '@/sim';
import { getLines } from '@/domain/lines';
import type { Lane as LaneState } from '@/state';
import type { SceneAction } from '@/state';
import styles from './Lane.module.css';

type Props = {
  readonly lane: LaneState;
  readonly dispatch: (action: SceneAction) => void;
  readonly isActive?: boolean;
  readonly onActivate?: () => void;
  readonly onRemove?: () => void;
};

/**
 * Eine einzelne Spielfeld-Lane: alle Picker, Rating-Anzeige und der
 * zugehörige Pitch. Mehrere Lanes nebeneinander bilden den
 * Split-Screen-Vergleich.
 */
export function Lane({ lane, dispatch, isActive, onActivate, onRemove }: Props) {
  const { scene } = lane;
  const evaluation = explainRating(scene);
  const rating = evaluation.rating;
  const holder = scene.home.players.find((p) => p.id === scene.ballHolderId);
  const awayLines = getLines(scene.away);
  const previewRatings: Record<string, Rating> = Object.fromEntries(
    scene.home.players
      .filter((p) => p.id !== scene.ballHolderId)
      .map((p) => [p.id, simulatePassPreview(scene, p.id)]),
  );
  const previewLines: Record<string, LineCount> = holder
    ? Object.fromEntries(
        scene.home.players
          .filter((p) => p.id !== scene.ballHolderId)
          .map((p) => [
            p.id,
            linesBroken(holder.position.y, p.position.y, awayLines, 'home'),
          ]),
      )
    : {};

  const laneClasses = [styles.lane, isActive ? styles.laneActive : '']
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={laneClasses}
      aria-label={`Szene ${lane.id}`}
      aria-current={isActive ? 'true' : undefined}
      onMouseDownCapture={onActivate}
    >
      {onRemove ? (
        <button
          type="button"
          className={styles.removeButton}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label={`Szene ${lane.id} entfernen`}
        >
          ×
        </button>
      ) : null}
      <section className={styles.controls}>
        <div className={styles.pickers}>
          <VariantPicker
            value={scene.variant}
            onChange={(variant) => dispatch({ type: 'setVariant', variant })}
          />
          <FirstTouchPicker
            value={scene.firstTouchPlan}
            onChange={(firstTouch) =>
              dispatch({ type: 'setFirstTouchPlan', firstTouch })
            }
          />
          <PassVelocityPicker
            value={scene.passPlan.velocity}
            onChange={(velocity) =>
              dispatch({ type: 'setPassVelocity', velocity })
            }
          />
          <PassAccuracyPicker
            value={scene.passPlan.accuracy}
            onChange={(accuracy) =>
              dispatch({ type: 'setPassAccuracy', accuracy })
            }
          />
          <StancePicker
            value={scene.stancePlan}
            onChange={(stance) => dispatch({ type: 'setStancePlan', stance })}
          />
          <OpponentPicker
            value={scene.away.formation}
            onChange={(awayFormation) =>
              dispatch({ type: 'setAwayFormation', awayFormation })
            }
          />
          <PressIntensityPicker
            value={scene.pressIntensity}
            onChange={(pressIntensity) =>
              dispatch({ type: 'setPressIntensity', pressIntensity })
            }
          />
        </div>
        <div className={styles.statusGroup}>
          <div className={styles.ratingGroup}>
            <RatingBadge rating={rating} />
            <p className={styles.ratingReason}>{evaluation.reason}</p>
          </div>
          <button
            className={styles.resetButton}
            type="button"
            onClick={() => dispatch({ type: 'reset' })}
          >
            Neu starten
          </button>
        </div>
      </section>

      <section className={styles.stage}>
        <Pitch
          home={scene.home}
          away={scene.away}
          ballHolderId={scene.ballHolderId}
          ballPos={scene.ballPos}
          ballFlight={scene.ballFlight}
          rating={rating}
          previewRatings={previewRatings}
          previewLines={previewLines}
          onPass={(targetId) => dispatch({ type: 'pass', targetId })}
          idPrefix={`${lane.id}-`}
        />
      </section>
    </article>
  );
}
