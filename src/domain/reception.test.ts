import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RECEPTION,
  receptionShiftWindow,
  RECEPTION_SHIFT_WINDOW_BY_FIRST_TOUCH,
} from './reception';

describe('DEFAULT_RECEPTION', () => {
  it('firstTouch default ist neutral', () => {
    expect(DEFAULT_RECEPTION.firstTouch).toBe('neutral');
  });
  it('stance default ist closed', () => {
    expect(DEFAULT_RECEPTION.stance).toBe('closed');
  });
});

describe('receptionShiftWindow', () => {
  it('saubere Annahme gibt kein Zusatzfenster', () => {
    expect(receptionShiftWindow('clean')).toBe(0);
  });

  it('unsaubere Annahme gibt das größte Zusatzfenster', () => {
    expect(RECEPTION_SHIFT_WINDOW_BY_FIRST_TOUCH.dirty).toBeGreaterThan(
      RECEPTION_SHIFT_WINDOW_BY_FIRST_TOUCH.neutral,
    );
    expect(RECEPTION_SHIFT_WINDOW_BY_FIRST_TOUCH.neutral).toBeGreaterThan(
      RECEPTION_SHIFT_WINDOW_BY_FIRST_TOUCH.clean,
    );
  });
});
