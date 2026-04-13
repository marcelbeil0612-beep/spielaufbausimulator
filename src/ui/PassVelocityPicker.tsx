import type { PassVelocity } from '@/domain';
import { PASS_VELOCITIES, PASS_VELOCITY_LABELS } from '@/domain';
import styles from './VariantPicker.module.css';

type Props = {
  readonly value: PassVelocity;
  readonly onChange: (next: PassVelocity) => void;
};

export function PassVelocityPicker({ value, onChange }: Props) {
  return (
    <div
      className={styles.group}
      role="radiogroup"
      aria-label="Passschärfe"
    >
      {PASS_VELOCITIES.map((velocity) => {
        const isActive = velocity === value;
        return (
          <button
            key={velocity}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`${styles.option} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(velocity)}
          >
            {PASS_VELOCITY_LABELS[velocity]}
          </button>
        );
      })}
    </div>
  );
}
