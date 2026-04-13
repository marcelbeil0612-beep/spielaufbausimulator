import type { FormationPattern } from '@/domain';
import { RadioPillGroup } from './RadioPillGroup';

const OPPONENT_OPTIONS: readonly FormationPattern[] = [
  '4-4-2',
  '4-2-3-1',
  '5-3-2',
];

const OPPONENT_LABELS: Record<FormationPattern, string> = {
  '4-3-3': '4-3-3',
  '4-4-2': '4-4-2',
  '4-2-3-1': '4-2-3-1',
  '5-3-2': '5-3-2',
};

type Props = {
  readonly value: FormationPattern;
  readonly onChange: (next: FormationPattern) => void;
};

export function OpponentPicker({ value, onChange }: Props) {
  return (
    <RadioPillGroup
      label="Gegner-Formation"
      options={OPPONENT_OPTIONS}
      labels={OPPONENT_LABELS}
      value={value}
      onChange={onChange}
    />
  );
}
