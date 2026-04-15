export type FirstTouch = 'clean' | 'neutral' | 'dirty';
export type Stance = 'open' | 'closed';

export type Reception = {
  readonly firstTouch: FirstTouch;
  readonly stance: Stance;
};

export const DEFAULT_RECEPTION: Reception = {
  firstTouch: 'neutral',
  stance: 'closed',
};

export const FIRST_TOUCHES: readonly FirstTouch[] = [
  'clean',
  'neutral',
  'dirty',
] as const;

export const FIRST_TOUCH_LABELS: Record<FirstTouch, string> = {
  clean: 'sauber',
  neutral: 'neutral',
  dirty: 'unsauber',
};

/**
 * Kurzes Zusatzfenster nach der eigentlichen Passankunft, in dem das
 * gegnerische Verschieben noch weiterlaufen darf. Bleibt bewusst klein:
 *  - sauber  -> kein Zusatzfenster
 *  - neutral -> kurzer Nachschub
 *  - unsauber -> etwas längerer, aber weiter klar begrenzter Nachschub
 */
export const RECEPTION_SHIFT_WINDOW_BY_FIRST_TOUCH: Record<FirstTouch, number> = {
  clean: 0,
  neutral: 0.14,
  dirty: 0.26,
};

export function receptionShiftWindow(firstTouch: FirstTouch): number {
  return RECEPTION_SHIFT_WINDOW_BY_FIRST_TOUCH[firstTouch];
}

export const STANCES: readonly Stance[] = ['open', 'closed'] as const;

export const STANCE_LABELS: Record<Stance, string> = {
  open: 'offen',
  closed: 'geschlossen',
};
