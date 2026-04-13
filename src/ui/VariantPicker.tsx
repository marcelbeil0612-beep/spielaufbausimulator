import type { StartVariant } from '@/domain';
import { START_VARIANT_LABELS, START_VARIANTS } from '@/domain';
import { RadioPillGroup } from './RadioPillGroup';

type Props = {
  readonly value: StartVariant;
  readonly onChange: (next: StartVariant) => void;
};

export function VariantPicker({ value, onChange }: Props) {
  return (
    <RadioPillGroup
      label="Startvariante"
      options={START_VARIANTS}
      labels={START_VARIANT_LABELS}
      value={value}
      onChange={onChange}
    />
  );
}
