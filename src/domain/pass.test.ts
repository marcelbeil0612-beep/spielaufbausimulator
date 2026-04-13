import { describe, it, expect } from 'vitest';
import { DEFAULT_PASS_OPTIONS } from './pass';

describe('DEFAULT_PASS_OPTIONS', () => {
  it('velocity default ist normal', () => {
    expect(DEFAULT_PASS_OPTIONS.velocity).toBe('normal');
  });
  it('accuracy default ist neutral', () => {
    expect(DEFAULT_PASS_OPTIONS.accuracy).toBe('neutral');
  });
});
