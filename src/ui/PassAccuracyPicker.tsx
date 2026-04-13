import type { PassAccuracy } from '@/domain';
import { PASS_ACCURACIES, PASS_ACCURACY_LABELS } from '@/domain';
import styles from './VariantPicker.module.css';

type Props = {
  readonly value: PassAccuracy;
  readonly onChange: (next: PassAccuracy) => void;
};

export function PassAccuracyPicker({ value, onChange }: Props) {
  return (
    <div
      className={styles.group}
      role="radiogroup"
      aria-label="Passgenauigkeit"
    >
      {PASS_ACCURACIES.map((accuracy) => {
        const isActive = accuracy === value;
        return (
          <button
            key={accuracy}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`${styles.option} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(accuracy)}
          >
            {PASS_ACCURACY_LABELS[accuracy]}
          </button>
        );
      })}
    </div>
  );
}
