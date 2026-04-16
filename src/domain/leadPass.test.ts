import { describe, it, expect } from 'vitest';
import { LEAD_PRESETS, LEAD_PRESET_LABELS, leadOffsetFor } from './leadPass';

describe('leadPass', () => {
  it('Labels existieren für jedes Preset', () => {
    for (const preset of LEAD_PRESETS) {
      expect(LEAD_PRESET_LABELS[preset]).toBeTruthy();
    }
  });

  it('"none" liefert einen Null-Offset', () => {
    const home = leadOffsetFor('none');
    const away = leadOffsetFor('none', false);
    expect(home.x).toBeCloseTo(0, 9);
    expect(home.y).toBeCloseTo(0, 9);
    expect(away.x).toBeCloseTo(0, 9);
    expect(away.y).toBeCloseTo(0, 9);
  });

  it('"short-ahead" zeigt für Heim nach +y, für Gast nach −y', () => {
    const home = leadOffsetFor('short-ahead', true);
    const away = leadOffsetFor('short-ahead', false);
    expect(home.y).toBeGreaterThan(0);
    expect(away.y).toBe(-home.y);
    expect(home.x).toBeCloseTo(0, 9);
    expect(away.x).toBeCloseTo(0, 9);
  });

  it('"diagonal-left" / "diagonal-right" sind x-seitig spiegelbildlich', () => {
    const left = leadOffsetFor('diagonal-left');
    const right = leadOffsetFor('diagonal-right');
    expect(left.x).toBe(-right.x);
    expect(left.y).toBe(right.y);
  });

  it('"far-ahead" liegt weiter vorne als "short-ahead"', () => {
    expect(leadOffsetFor('far-ahead').y).toBeGreaterThan(
      leadOffsetFor('short-ahead').y,
    );
  });
});
