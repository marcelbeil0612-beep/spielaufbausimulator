import type { StartVariant } from '@/domain';
import { START_VARIANT_LABELS, START_VARIANTS } from '@/domain';
import styles from './VariantPicker.module.css';

type Props = {
  readonly value: StartVariant;
  readonly onChange: (next: StartVariant) => void;
};

export function VariantPicker({ value, onChange }: Props) {
  return (
    <div
      className={styles.group}
      role="radiogroup"
      aria-label="Startvariante"
    >
      {START_VARIANTS.map((variant) => {
        const isActive = variant === value;
        return (
          <button
            key={variant}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`${styles.option} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(variant)}
          >
            {START_VARIANT_LABELS[variant]}
          </button>
        );
      })}
    </div>
  );
}
