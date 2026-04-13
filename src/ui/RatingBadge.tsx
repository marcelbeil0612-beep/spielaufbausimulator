import type { Rating } from '@/sim';
import styles from './RatingBadge.module.css';

type Props = { readonly rating: Rating };

const LABELS: Record<Rating, string> = {
  open: 'offen',
  pressure: 'Druck',
  risky: 'riskant',
  'loss-danger': 'Ballverlust-Gefahr',
};

const MODIFIERS: Record<Rating, string> = {
  open: styles.open,
  pressure: styles.pressure,
  risky: styles.risky,
  'loss-danger': styles.loss,
};

export function RatingBadge({ rating }: Props) {
  return (
    <span
      className={`${styles.badge} ${MODIFIERS[rating]}`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.dot} aria-hidden="true" />
      {LABELS[rating]}
    </span>
  );
}
