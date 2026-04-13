import type { PassVelocity } from '@/domain';
import { PASS_VELOCITIES, PASS_VELOCITY_LABELS } from '@/domain';
import { RadioPillGroup } from './RadioPillGroup';

type Props = {
  readonly value: PassVelocity;
  readonly onChange: (next: PassVelocity) => void;
};

export function PassVelocityPicker({ value, onChange }: Props) {
  return (
    <RadioPillGroup
      label="Passschärfe"
      options={PASS_VELOCITIES}
      labels={PASS_VELOCITY_LABELS}
      value={value}
      onChange={onChange}
    />
  );
}
