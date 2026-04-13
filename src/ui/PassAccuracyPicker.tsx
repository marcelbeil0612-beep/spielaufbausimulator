import type { PassAccuracy } from '@/domain';
import { PASS_ACCURACIES, PASS_ACCURACY_LABELS } from '@/domain';
import { RadioPillGroup } from './RadioPillGroup';

type Props = {
  readonly value: PassAccuracy;
  readonly onChange: (next: PassAccuracy) => void;
};

export function PassAccuracyPicker({ value, onChange }: Props) {
  return (
    <RadioPillGroup
      label="Passgenauigkeit"
      options={PASS_ACCURACIES}
      labels={PASS_ACCURACY_LABELS}
      value={value}
      onChange={onChange}
    />
  );
}
