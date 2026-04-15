import { describe, expect, it } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import { classifyPassWindow, assessPassWindowInScene, PASS_WINDOW_LABELS } from './passWindow';

describe('classifyPassWindow', () => {
  it('blocker auf der Linie → blocked', () => {
    expect(classifyPassWindow({ closest: 0, blockers: 1, threats: 0 })).toBe(
      'blocked',
    );
  });

  it('threat im erweiterten Band → tight', () => {
    expect(classifyPassWindow({ closest: 4.5, blockers: 0, threats: 1 })).toBe(
      'tight',
    );
  });

  it('freie Linie ohne Gegnerdruck → open', () => {
    expect(
      classifyPassWindow({ closest: Infinity, blockers: 0, threats: 0 }),
    ).toBe('open');
  });
});

describe('assessPassWindowInScene', () => {
  it('Startszene TW → LIV ist offen', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB')!;
    expect(assessPassWindowInScene(scene, liv.id)).toBe('open');
  });

  it('Label-Map bleibt kompakt lesbar', () => {
    expect(PASS_WINDOW_LABELS.tight).toBe('Passweg eng');
  });
});
