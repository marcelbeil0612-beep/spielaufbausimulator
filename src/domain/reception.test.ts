import { describe, it, expect } from 'vitest';
import { DEFAULT_RECEPTION } from './reception';

describe('DEFAULT_RECEPTION', () => {
  it('firstTouch default ist neutral', () => {
    expect(DEFAULT_RECEPTION.firstTouch).toBe('neutral');
  });
  it('stance default ist closed', () => {
    expect(DEFAULT_RECEPTION.stance).toBe('closed');
  });
});
