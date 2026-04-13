export type PassVelocity = 'sharp' | 'normal' | 'soft';
export type PassAccuracy = 'precise' | 'neutral' | 'imprecise';

export type PassOptions = {
  readonly velocity: PassVelocity;
  readonly accuracy: PassAccuracy;
};

export const DEFAULT_PASS_OPTIONS: PassOptions = {
  velocity: 'normal',
  accuracy: 'neutral',
};

export const PASS_VELOCITIES: readonly PassVelocity[] = [
  'soft',
  'normal',
  'sharp',
] as const;

export const PASS_VELOCITY_LABELS: Record<PassVelocity, string> = {
  soft: 'weich',
  normal: 'normal',
  sharp: 'scharf',
};

export const PASS_ACCURACIES: readonly PassAccuracy[] = [
  'precise',
  'neutral',
  'imprecise',
] as const;

export const PASS_ACCURACY_LABELS: Record<PassAccuracy, string> = {
  precise: 'präzise',
  neutral: 'neutral',
  imprecise: 'ungenau',
};
