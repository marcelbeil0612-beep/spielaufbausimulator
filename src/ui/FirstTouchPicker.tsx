import type { FirstTouch } from '@/domain';
import { FIRST_TOUCHES, FIRST_TOUCH_LABELS } from '@/domain';
import { RadioPillGroup } from './RadioPillGroup';

type Props = {
  readonly value: FirstTouch;
  readonly onChange: (next: FirstTouch) => void;
};

export function FirstTouchPicker({ value, onChange }: Props) {
  return (
    <RadioPillGroup
      label="Erster Kontakt"
      options={FIRST_TOUCHES}
      labels={FIRST_TOUCH_LABELS}
      value={value}
      onChange={onChange}
    />
  );
}
