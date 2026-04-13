import type { PressIntensity } from '@/domain';
import { PRESS_INTENSITIES, PRESS_INTENSITY_LABELS } from '@/domain';
import { RadioPillGroup } from './RadioPillGroup';

type Props = {
  readonly value: PressIntensity;
  readonly onChange: (next: PressIntensity) => void;
};

export function PressIntensityPicker({ value, onChange }: Props) {
  return (
    <RadioPillGroup
      label="Presshöhe"
      options={PRESS_INTENSITIES}
      labels={PRESS_INTENSITY_LABELS}
      value={value}
      onChange={onChange}
    />
  );
}
