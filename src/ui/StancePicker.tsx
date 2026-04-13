import type { Stance } from '@/domain';
import { STANCES, STANCE_LABELS } from '@/domain';
import styles from './VariantPicker.module.css';

type Props = {
  readonly value: Stance;
  readonly onChange: (next: Stance) => void;
};

export function StancePicker({ value, onChange }: Props) {
  return (
    <div
      className={styles.group}
      role="radiogroup"
      aria-label="Körperstellung des Empfängers"
    >
      {STANCES.map((stance) => {
        const isActive = stance === value;
        return (
          <button
            key={stance}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`${styles.option} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(stance)}
          >
            {STANCE_LABELS[stance]}
          </button>
        );
      })}
    </div>
  );
}
