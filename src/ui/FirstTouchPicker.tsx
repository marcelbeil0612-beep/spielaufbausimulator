import type { FirstTouch } from '@/domain';
import { FIRST_TOUCHES, FIRST_TOUCH_LABELS } from '@/domain';
import styles from './VariantPicker.module.css';

type Props = {
  readonly value: FirstTouch;
  readonly onChange: (next: FirstTouch) => void;
};

export function FirstTouchPicker({ value, onChange }: Props) {
  return (
    <div
      className={styles.group}
      role="radiogroup"
      aria-label="Erster Kontakt"
    >
      {FIRST_TOUCHES.map((firstTouch) => {
        const isActive = firstTouch === value;
        return (
          <button
            key={firstTouch}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`${styles.option} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(firstTouch)}
          >
            {FIRST_TOUCH_LABELS[firstTouch]}
          </button>
        );
      })}
    </div>
  );
}
