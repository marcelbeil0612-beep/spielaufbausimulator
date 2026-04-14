import { useState } from 'react';
import { Pitch } from './Pitch';
import { RatingBadge } from './RatingBadge';
import { VariantPicker } from './VariantPicker';
import { FirstTouchPicker } from './FirstTouchPicker';
import { PassVelocityPicker } from './PassVelocityPicker';
import { PassAccuracyPicker } from './PassAccuracyPicker';
import { StancePicker } from './StancePicker';
import { OpponentPicker } from './OpponentPicker';
import { PressIntensityPicker } from './PressIntensityPicker';
import {
  explainPrimarySuggestion,
  explainRating,
  linesBroken,
  simulatePassPreview,
  suggestMoves,
} from '@/sim';
import type { LineCount, Rating, SuggestedMove } from '@/sim';
import { getLines } from '@/domain/lines';
import type { Lane as LaneState } from '@/state';
import type { SceneAction } from '@/state';
import styles from './Lane.module.css';

type Props = {
  readonly lane: LaneState;
  readonly dispatch: (action: SceneAction) => void;
  readonly isActive?: boolean | undefined;
  readonly onActivate?: (() => void) | undefined;
  readonly onRemove?: (() => void) | undefined;
};

/**
 * Eine einzelne Spielfeld-Lane: alle Picker, Rating-Anzeige und der
 * zugehörige Pitch. Mehrere Lanes nebeneinander bilden den
 * Split-Screen-Vergleich.
 */
export function Lane({ lane, dispatch, isActive, onActivate, onRemove }: Props) {
  const { scene } = lane;
  const [editMode, setEditMode] = useState(false);
  const [coachingOverlay, setCoachingOverlay] = useState(false);
  const [suggestionsOn, setSuggestionsOn] = useState(false);
  const animating = scene.ballFlight !== null || scene.dribble !== null;
  // Vorschläge nur anzeigen, wenn nicht animiert und nicht im Edit-Modus –
  // Edit-Modus bedeutet, dass der User selbst positioniert; Vorschläge dort
  // würden irritieren.
  const suggestions: readonly SuggestedMove[] =
    suggestionsOn && !animating && !editMode ? suggestMoves(scene) : [];
  const applySuggestion = (s: SuggestedMove) => {
    dispatch({ type: 'movePlayer', playerId: s.playerId, position: s.to });
  };
  const evaluation = explainRating(scene, scene.lastPassLane ?? undefined);
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

  const laneClasses = [
    styles.lane,
    isActive ? styles.laneActive : '',
    editMode ? styles.laneEdit : '',
  ]
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
          <div className={styles.pickerGroup}>
            <span className={styles.pickerGroupLabel}>Start</span>
            <VariantPicker
              value={scene.variant}
              onChange={(variant) => dispatch({ type: 'setVariant', variant })}
            />
          </div>
          <div className={styles.pickerGroup}>
            <span className={styles.pickerGroupLabel}>Pass</span>
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
          </div>
          <div className={styles.pickerGroup}>
            <span className={styles.pickerGroupLabel}>Annahme</span>
            <FirstTouchPicker
              value={scene.firstTouchPlan}
              onChange={(firstTouch) =>
                dispatch({ type: 'setFirstTouchPlan', firstTouch })
              }
            />
            <StancePicker
              value={scene.stancePlan}
              onChange={(stance) => dispatch({ type: 'setStancePlan', stance })}
            />
          </div>
          <div className={styles.pickerGroup}>
            <span className={styles.pickerGroupLabel}>Gegner</span>
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
        </div>
        <div className={styles.statusGroup}>
          <div className={styles.ratingGroup}>
            <RatingBadge rating={rating} />
            <p className={styles.ratingReason}>{evaluation.reason}</p>
          </div>
          <button
            className={`${styles.resetButton} ${editMode ? styles.editButtonActive : ''}`}
            type="button"
            onClick={() => setEditMode((v) => !v)}
            disabled={animating}
            aria-pressed={editMode}
            aria-label={
              editMode
                ? 'Formations-Editor beenden'
                : 'Formations-Editor starten'
            }
          >
            {editMode ? '✓ Fertig' : '🖊 Positionen'}
          </button>
          <button
            className={`${styles.resetButton} ${coachingOverlay ? styles.editButtonActive : ''}`}
            type="button"
            onClick={() => setCoachingOverlay((v) => !v)}
            aria-pressed={coachingOverlay}
            aria-label={
              coachingOverlay
                ? 'Coaching-Overlay ausblenden'
                : 'Coaching-Overlay einblenden'
            }
          >
            {coachingOverlay ? '◎ Overlay an' : '◌ Overlay'}
          </button>
          <button
            className={`${styles.resetButton} ${suggestionsOn ? styles.editButtonActive : ''}`}
            type="button"
            onClick={() => setSuggestionsOn((v) => !v)}
            aria-pressed={suggestionsOn}
            aria-label={
              suggestionsOn
                ? 'Vorschläge ausblenden'
                : 'Vorschläge einblenden'
            }
          >
            {suggestionsOn ? '💡 Vorschläge an' : '💡 Vorschläge'}
          </button>
          <button
            className={styles.resetButton}
            type="button"
            onClick={() => dispatch({ type: 'undo' })}
            disabled={scene.history.length === 0}
            aria-label="Letzte Aktion rückgängig machen"
          >
            ↶ Undo
          </button>
          <button
            className={styles.resetButton}
            type="button"
            onClick={() => dispatch({ type: 'reset' })}
          >
            Neu starten
          </button>
        </div>
      </section>

      {editMode ? (
        <div className={styles.editBanner} role="status">
          <strong>Edit-Modus aktiv.</strong> Spieler per Drag verschieben –
          Pässe sind pausiert. Klick auf <em>✓ Fertig</em>, um zu spielen.
        </div>
      ) : null}
      {coachingOverlay ? (
        <ul className={styles.overlayLegend} aria-label="Coaching-Overlay Legende">
          <li>
            <span className={`${styles.legendSwatch} ${styles.legendLineAway}`} aria-hidden="true" />
            Gegner-Linien (Abwehr / Mittelfeld / Angriff)
          </li>
          <li>
            <span className={`${styles.legendSwatch} ${styles.legendLineHome}`} aria-hidden="true" />
            Eigene Linien
          </li>
          <li>
            <span className={`${styles.legendSwatch} ${styles.legendPressure}`} aria-hidden="true" />
            Presseradius um den Ballträger (ab hier zählt Druck)
          </li>
          <li>
            <span className={`${styles.legendSwatch} ${styles.legendContact}`} aria-hidden="true" />
            Nahkontakt-Radius (kritisch bei unsauberer Annahme)
          </li>
        </ul>
      ) : null}
      <section className={styles.stage}>
        <Pitch
          home={scene.home}
          away={scene.away}
          ballHolderId={scene.ballHolderId}
          ballPos={scene.ballPos}
          ballFlight={scene.ballFlight}
          dribble={scene.dribble}
          rating={rating}
          previewRatings={previewRatings}
          previewLines={previewLines}
          editMode={editMode}
          coachingOverlay={coachingOverlay}
          suggestions={suggestions}
          onApplySuggestion={applySuggestion}
          onPass={(targetId) => dispatch({ type: 'pass', targetId })}
          onDribble={(targetPos) => dispatch({ type: 'dribble', targetPos })}
          onMovePlayer={(playerId, position) =>
            dispatch({ type: 'movePlayer', playerId, position })
          }
          idPrefix={`${lane.id}-`}
        />
      </section>
      {suggestions.length > 0 ? (
        <ul className={styles.suggestionList} aria-label="Anschlussbewegungen">
          {suggestions.map((s, i) => {
            const player = scene.home.players.find((p) => p.id === s.playerId);
            const isPrimary = i === 0;
            return (
              <li key={s.code}>
                <button
                  type="button"
                  className={`${styles.suggestionButton} ${
                    isPrimary
                      ? styles.suggestionPrimary
                      : styles.suggestionAlternate
                  }`}
                  onClick={() => applySuggestion(s)}
                >
                  <span className={styles.suggestionKind}>
                    {isPrimary ? 'Beste Anschlussbewegung' : 'Alternative'}
                  </span>
                  <span className={styles.suggestionTitleRow}>
                    <strong>{s.title}</strong>
                    {player ? (
                      <span className={styles.suggestionPlayer}>
                        · {player.label}
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.suggestionReason}>
                    {isPrimary ? explainPrimarySuggestion(s, scene) : s.reason}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </article>
  );
}
