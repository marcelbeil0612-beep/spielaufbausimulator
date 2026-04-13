import { useRef, type KeyboardEvent } from 'react';
import styles from './VariantPicker.module.css';

type Props<T extends string> = {
  readonly label: string;
  readonly options: readonly T[];
  readonly labels: Readonly<Record<T, string>>;
  readonly value: T;
  readonly onChange: (next: T) => void;
};

/**
 * Pill-förmige Radiogruppe mit ARIA-konformer Tastaturbedienung:
 *  - Nur die aktive Option liegt im Tab-Flow (roving tabindex).
 *  - Pfeiltasten links/oben / rechts/unten wählen und fokussieren die
 *    nächste Option; Home/End springen an die Ränder.
 *  - Space/Enter sind durch die native Button-Semantik abgedeckt.
 */
export function RadioPillGroup<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: Props<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const activate = (index: number) => {
    const normalized = (index + options.length) % options.length;
    const next = options[normalized];
    if (next === undefined) return;
    if (next !== value) onChange(next);
    refs.current[normalized]?.focus();
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLButtonElement>,
  ) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        activate(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        activate(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        activate(0);
        break;
      case 'End':
        event.preventDefault();
        activate(options.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className={styles.group} role="radiogroup" aria-label={label}>
      {options.map((option, i) => {
        const isActive = option === value;
        return (
          <button
            key={option}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            className={`${styles.option} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(option)}
            onKeyDown={(event) => handleKeyDown(i, event)}
          >
            {labels[option]}
          </button>
        );
      })}
    </div>
  );
}
