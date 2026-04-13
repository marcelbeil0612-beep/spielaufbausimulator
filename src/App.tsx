import { Pitch } from './ui/Pitch';
import { RatingBadge } from './ui/RatingBadge';
import { VariantPicker } from './ui/VariantPicker';
import { FirstTouchPicker } from './ui/FirstTouchPicker';
import { PassVelocityPicker } from './ui/PassVelocityPicker';
import { PassAccuracyPicker } from './ui/PassAccuracyPicker';
import { useScene } from './state';
import { evaluate, simulatePassPreview } from './sim';
import type { Rating } from './sim';
import styles from './App.module.css';

export function App() {
  const { scene, dispatch } = useScene();
  const rating = evaluate(scene);
  const previewRatings: Record<string, Rating> = Object.fromEntries(
    scene.home.players
      .filter((p) => p.id !== scene.ballHolderId)
      .map((p) => [p.id, simulatePassPreview(scene, p.id)]),
  );

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Spielaufbau-Simulator</h1>
        <p className={styles.subtitle}>
          Lehrfall: 4-3-3 gegen 4-4-2 hohes Pressing · Pass TW → linker
          Innenverteidiger
        </p>
      </header>

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
        </div>
        <div className={styles.statusGroup}>
          <RatingBadge rating={rating} />
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
          rating={rating}
          previewRatings={previewRatings}
          onPass={(targetId) => dispatch({ type: 'pass', targetId })}
        />
      </section>

      <p className={styles.hint}>
        Wähle Startvariante, ersten Kontakt, Passschärfe und Passgenauigkeit –
        tippe dann einen Mitspieler, um zu passen. Der ballnahe Stürmer
        reagiert, der Ring am Ballträger zeigt die Bewertung, der
        Vorschau-Ring auf Hover/Fokus die hypothetische Bewertung vor dem
        Klick.
      </p>
    </main>
  );
}
