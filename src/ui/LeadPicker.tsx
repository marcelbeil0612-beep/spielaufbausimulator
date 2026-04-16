import type { LeadPreset } from '@/domain';
import { LEAD_PRESETS, LEAD_PRESET_LABELS } from '@/domain';
import { RadioPillGroup } from './RadioPillGroup';

type Props = {
  readonly value: LeadPreset;
  readonly onChange: (next: LeadPreset) => void;
};

export function LeadPicker({ value, onChange }: Props) {
  return (
    <RadioPillGroup
      label="Lead-Pass"
      options={LEAD_PRESETS}
      labels={LEAD_PRESET_LABELS}
      value={value}
      onChange={onChange}
    />
  );
}
