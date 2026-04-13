import type { Stance } from '@/domain';
import { STANCES, STANCE_LABELS } from '@/domain';
import { RadioPillGroup } from './RadioPillGroup';

type Props = {
  readonly value: Stance;
  readonly onChange: (next: Stance) => void;
};

export function StancePicker({ value, onChange }: Props) {
  return (
    <RadioPillGroup
      label="Körperstellung des Empfängers"
      options={STANCES}
      labels={STANCE_LABELS}
      value={value}
      onChange={onChange}
    />
  );
}
