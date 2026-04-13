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
