import { SCENARIOS } from '@/domain/scenarios';
import styles from './ScenarioPicker.module.css';

type Props = {
  readonly onLoad: (scenarioId: string) => void;
  readonly disabled?: boolean;
};

/**
 * Select zum Laden vorkonfigurierter Lehrszenen. Ein ausgewählter Eintrag
 * löst sofort `loadScenario` aus; das Select selbst behält keinen
 * gebundenen Wert, damit das wiederholte Laden desselben Presets
 * möglich bleibt.
 */
export function ScenarioPicker({ onLoad, disabled }: Props) {
  return (
    <label className={styles.wrapper}>
      <span className={styles.label}>Lehrszene</span>
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
          Preset laden …
        </option>
        {SCENARIOS.map((scenario) => (
          <option key={scenario.id} value={scenario.id} title={scenario.description}>
            {scenario.label}
          </option>
        ))}
      </select>
      <span className={styles.hint}>Erneut laden stellt die Ausgangslage wieder her.</span>
    </label>
  );
}
