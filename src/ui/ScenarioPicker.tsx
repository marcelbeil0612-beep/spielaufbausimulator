import { SCENARIOS } from '@/domain/scenarios';
import styles from './ScenarioPicker.module.css';

type Props = {
  readonly onLoad: (scenarioId: string) => void;
  readonly disabled?: boolean;
};

/**
 * Select zum Laden vorkonfigurierter Szenarien. Ein ausgewählter Eintrag
 * löst sofort `loadScenario` aus; das Select selbst behält keinen
 * gebundenen Wert, damit das wiederholte Laden des gleichen Szenarios
 * möglich bleibt.
 */
export function ScenarioPicker({ onLoad, disabled }: Props) {
  return (
    <label className={styles.wrapper}>
      <span className={styles.label}>Szenario</span>
      <select
        className={styles.select}
        defaultValue=""
        disabled={disabled}
        onChange={(event) => {
          const id = event.target.value;
          if (!id) return;
          onLoad(id);
          event.target.value = '';
        }}
      >
        <option value="" disabled>
          Szenario laden …
        </option>
        {SCENARIOS.map((scenario) => (
          <option key={scenario.id} value={scenario.id} title={scenario.description}>
            {scenario.label}
          </option>
        ))}
      </select>
    </label>
  );
}
