import { describe, it, expect } from 'vitest';
import type { Scene } from '@/domain/scene';
import { createInitialScene } from '@/domain/scene';
import { distance } from '@/domain/geometry';
import { sceneReducer } from '@/state/sceneReducer';
import {
  explainPrimarySuggestion,
  scoreSuggestion,
  suggestMoves,
} from './suggestMoves';
import type { SuggestedMove } from './suggestMoves';

function withHolder(scene: Scene, holderId: string): Scene {
  return { ...scene, ballHolderId: holderId };
}

describe('suggestMoves', () => {
  it('liefert bei Standardszene mindestens einen sinnvollen Vorschlag', () => {
    const scene = createInitialScene();
    const suggestions = suggestMoves(scene);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(2);
  });

  it('Ballhalter bekommt keinen Vorschlag', () => {
    const scene = createInitialScene();
    const suggestions = suggestMoves(scene);
    for (const s of suggestions) {
      expect(s.playerId).not.toBe(scene.ballHolderId);
    }
  });

  it('keine Duplikate – jeder Spieler höchstens einmal', () => {
    const scene = createInitialScene();
    const suggestions = suggestMoves(scene);
    const ids = suggestions.map((s) => s.playerId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keine Duplikat-Codes – jede Heuristik höchstens einmal', () => {
    const scene = createInitialScene();
    const suggestions = suggestMoves(scene);
    const codes = suggestions.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('Zielpositionen liegen im Feld (mit Rand)', () => {
    const scene = createInitialScene();
    const suggestions = suggestMoves(scene);
    for (const s of suggestions) {
      expect(s.to.x).toBeGreaterThanOrEqual(5);
      expect(s.to.x).toBeLessThanOrEqual(95);
      expect(s.to.y).toBeGreaterThanOrEqual(5);
      expect(s.to.y).toBeLessThanOrEqual(95);
    }
  });

  it('Vorschläge sind klein / konservativ (max 10 Einheiten)', () => {
    const scene = createInitialScene();
    const suggestions = suggestMoves(scene);
    for (const s of suggestions) {
      // +kleine Toleranz für Fließkomma
      expect(distance(s.from, s.to)).toBeLessThanOrEqual(10.0001);
    }
  });

  it('nach Pass auf LIV erkennt mindestens eine der beiden Heuristiken', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB')!;
    const afterPass = withHolder(scene, liv.id);
    const suggestions = suggestMoves(afterPass);
    const codes = new Set(suggestions.map((s) => s.code));
    expect(
      codes.has('support_ball') || codes.has('between_lines'),
    ).toBe(true);
  });

  it('erreicht `between_lines`: Zielposition liegt zwischen Away-Mittelfeld und Away-Abwehr', () => {
    const scene = createInitialScene();
    const suggestions = suggestMoves(scene);
    const bl = suggestions.find((s) => s.code === 'between_lines');
    if (!bl) return;
    const awayMidY =
      scene.away.players
        .filter((p) => ['CDM', 'LCM', 'RCM', 'CAM', 'LM', 'RM'].includes(p.role))
        .reduce((sum, p) => sum + p.position.y, 0) /
      scene.away.players.filter((p) =>
        ['CDM', 'LCM', 'RCM', 'CAM', 'LM', 'RM'].includes(p.role),
      ).length;
    const awayDefY =
      scene.away.players
        .filter((p) => ['LB', 'LCB', 'RCB', 'RB'].includes(p.role))
        .reduce((sum, p) => sum + p.position.y, 0) /
      scene.away.players.filter((p) =>
        ['LB', 'LCB', 'RCB', 'RB'].includes(p.role),
      ).length;
    const lo = Math.min(awayMidY, awayDefY);
    const hi = Math.max(awayMidY, awayDefY);
    expect(bl.to.y).toBeGreaterThanOrEqual(lo - 0.5);
    expect(bl.to.y).toBeLessThanOrEqual(hi + 0.5);
  });

  it('erreicht `support_ball`: Zielposition liegt näher am Ballhalter als die Ausgangsposition', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB')!;
    const afterPass = withHolder(scene, liv.id);
    const suggestions = suggestMoves(afterPass);
    const sb = suggestions.find((s) => s.code === 'support_ball');
    if (!sb) return;
    const dBefore = distance(sb.from, liv.position);
    const dAfter = distance(sb.to, liv.position);
    expect(dAfter).toBeLessThan(dBefore);
    expect(dAfter).toBeGreaterThanOrEqual(8); // Mindestabstand nicht unterschreiten
  });

  it('gibt bei unbekanntem Ballhalter nichts zurück', () => {
    const scene = createInitialScene();
    const broken: Scene = { ...scene, ballHolderId: 'does-not-exist' };
    expect(suggestMoves(broken)).toEqual([]);
  });

  it('gibt bei Gast-Ballhalter nichts zurück (MVP: nur Heim)', () => {
    const scene = createInitialScene();
    const awayId = scene.away.players[0]!.id;
    const awayHolder: Scene = { ...scene, ballHolderId: awayId };
    expect(suggestMoves(awayHolder)).toEqual([]);
  });
});

describe('suggestMoves – Priorisierung', () => {
  it('liefert bei gleicher Szene deterministisch dieselbe Reihenfolge', () => {
    const scene = createInitialScene();
    const a = suggestMoves(scene);
    const b = suggestMoves(scene);
    expect(a.map((s) => s.code)).toEqual(b.map((s) => s.code));
  });

  it('sortiert absteigend nach Score (Hauptempfehlung an Position 0)', () => {
    const scene = createInitialScene();
    const suggestions = suggestMoves(scene);
    for (let i = 0; i < suggestions.length - 1; i++) {
      const a = scoreSuggestion(suggestions[i]!, scene);
      const b = scoreSuggestion(suggestions[i + 1]!, scene);
      expect(a).toBeGreaterThanOrEqual(b);
    }
  });

  it('kleinere Bewegung erhält höheren Score als größere bei gleichem Code', () => {
    const scene = createInitialScene();
    const holder = scene.home.players.find((p) => p.id === scene.ballHolderId)!;
    // Beide Varianten landen im direkt-anspielbar-Bereich (≤ 12 → +8 Bonus),
    // damit nur die Schrittgröße den Unterschied macht.
    const small: SuggestedMove = {
      playerId: 'x',
      from: { x: holder.position.x, y: holder.position.y + 15 },
      to: { x: holder.position.x, y: holder.position.y + 11 },
      code: 'support_ball',
      title: 'test',
      reason: 'test',
    };
    const large: SuggestedMove = {
      ...small,
      from: { x: holder.position.x, y: holder.position.y + 18 },
      to: { x: holder.position.x, y: holder.position.y + 10 },
    };
    // small: step 4, endDist 11 (+8). large: step 8, endDist 10 (+8).
    expect(scoreSuggestion(small, scene)).toBeGreaterThan(
      scoreSuggestion(large, scene),
    );
  });

  it('bei nur einem Vorschlag ist suggestions[1] undefined – kein Crash', () => {
    const scene = createInitialScene();
    const suggestions = suggestMoves(scene);
    // Der zweite Vorschlag darf fehlen – wir lesen [1] bewusst optional ab.
    const alternate = suggestions[1];
    expect(() => alternate?.code).not.toThrow();
  });

  it('bei leerer Vorschlagsliste bleibt das Array leer', () => {
    const scene = createInitialScene();
    const broken: Scene = { ...scene, ballHolderId: 'nope' };
    expect(suggestMoves(broken)).toEqual([]);
  });

  it('bestehende PoC-Invarianten bleiben intakt (max 2, im Feld, ≤ 10)', () => {
    const scene = createInitialScene();
    const suggestions = suggestMoves(scene);
    expect(suggestions.length).toBeLessThanOrEqual(2);
    for (const s of suggestions) {
      expect(s.to.x).toBeGreaterThanOrEqual(5);
      expect(s.to.x).toBeLessThanOrEqual(95);
      expect(s.to.y).toBeGreaterThanOrEqual(5);
      expect(s.to.y).toBeLessThanOrEqual(95);
    }
  });

  it('turn-Kontext begünstigt progressive between-lines-Lösung leicht zusätzlich', () => {
    const start = createInitialScene();
    const st = start.home.players.find((p) => p.role === 'ST')!;
    const contextual: Scene = {
      ...start,
      ballHolderId: st.id,
      lastPass: { velocity: 'normal', accuracy: 'neutral' },
      lastReception: { firstTouch: 'clean', stance: 'open' },
      history: [start],
    };
    const base: Scene = {
      ...contextual,
      lastPass: null,
      lastReception: null,
      history: [],
    };
    const move: SuggestedMove = {
      playerId: 'x',
      from: { x: 48, y: 42 },
      to: { x: 50, y: 58 },
      code: 'between_lines',
      title: 't',
      reason: 'r',
    };
    expect(scoreSuggestion(move, contextual)).toBeGreaterThan(
      scoreSuggestion(move, base),
    );
  });

  it('dirty first touch unter Druck begünstigt support_ball als sichere Folgeoption', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const contextual = sceneReducer(
      sceneReducer(start, {
        type: 'pass',
        targetId: liv.id,
        firstTouch: 'dirty',
      }),
      { type: 'skipFlight' },
    );
    const base: Scene = {
      ...contextual,
      lastPass: null,
      lastReception: null,
      history: [],
    };
    const holder = contextual.home.players.find((p) => p.id === contextual.ballHolderId)!;
    const move: SuggestedMove = {
      playerId: 'x',
      from: { x: holder.position.x + 8, y: holder.position.y + 15 },
      to: { x: holder.position.x + 4, y: holder.position.y + 9 },
      code: 'support_ball',
      title: 't',
      reason: 'r',
    };
    expect(scoreSuggestion(move, contextual)).toBeGreaterThan(
      scoreSuggestion(move, base),
    );
  });
});

describe('explainPrimarySuggestion', () => {
  it('support_ball mit kurzer Endentfernung → "sofort...sichere Anspielstation"', () => {
    const scene = createInitialScene();
    const holder = scene.home.players.find((p) => p.id === scene.ballHolderId)!;
    const s: SuggestedMove = {
      playerId: 'x',
      from: { x: holder.position.x, y: holder.position.y + 20 },
      to: { x: holder.position.x, y: holder.position.y + 10 },
      code: 'support_ball',
      title: 't',
      reason: 'r',
    };
    expect(explainPrimarySuggestion(s, scene)).toMatch(/sofort.*Anspielstation/);
  });

  it('support_ball mit großer Endentfernung → "verkürzt den Abstand"', () => {
    const scene = createInitialScene();
    const holder = scene.home.players.find((p) => p.id === scene.ballHolderId)!;
    const s: SuggestedMove = {
      playerId: 'x',
      from: { x: holder.position.x, y: holder.position.y + 30 },
      to: { x: holder.position.x, y: holder.position.y + 20 },
      code: 'support_ball',
      title: 't',
      reason: 'r',
    };
    expect(explainPrimarySuggestion(s, scene)).toMatch(/Verkürzt/);
  });

  it('between_lines zentral → "zentral...Mittelfeld und Abwehr"', () => {
    const scene = createInitialScene();
    const s: SuggestedMove = {
      playerId: 'x',
      from: { x: 50, y: 40 },
      to: { x: 52, y: 60 },
      code: 'between_lines',
      title: 't',
      reason: 'r',
    };
    expect(explainPrimarySuggestion(s, scene)).toMatch(
      /zentral.*Mittelfeld und Abwehr/,
    );
  });

  it('between_lines im Halbraum → "Raum hinter dem gegnerischen Mittelfeld"', () => {
    const scene = createInitialScene();
    const s: SuggestedMove = {
      playerId: 'x',
      from: { x: 30, y: 40 },
      to: { x: 30, y: 60 },
      code: 'between_lines',
      title: 't',
      reason: 'r',
    };
    expect(explainPrimarySuggestion(s, scene)).toMatch(/freien Raum hinter/);
  });

  it('kein Crash bei unbekanntem Ballhalter (support_ball → verkürzt-Variante)', () => {
    const scene = createInitialScene();
    const broken: Scene = { ...scene, ballHolderId: 'missing' };
    const s: SuggestedMove = {
      playerId: 'x',
      from: { x: 50, y: 40 },
      to: { x: 50, y: 45 },
      code: 'support_ball',
      title: 't',
      reason: 'r',
    };
    expect(() => explainPrimarySuggestion(s, broken)).not.toThrow();
    expect(explainPrimarySuggestion(s, broken)).toMatch(/Verkürzt/);
  });

  it('support_ball unter dirty/Pressing kann didaktisch Richtung Klatschball begründen', () => {
    const start = createInitialScene();
    const liv = start.home.players.find((p) => p.role === 'LCB')!;
    const scene = sceneReducer(
      sceneReducer(start, {
        type: 'pass',
        targetId: liv.id,
        firstTouch: 'dirty',
      }),
      { type: 'skipFlight' },
    );
    const holder = scene.home.players.find((p) => p.id === scene.ballHolderId)!;
    const s: SuggestedMove = {
      playerId: 'x',
      from: { x: holder.position.x + 8, y: holder.position.y + 14 },
      to: { x: holder.position.x + 3, y: holder.position.y + 10 },
      code: 'support_ball',
      title: 't',
      reason: 'r',
    };
    expect(explainPrimarySuggestion(s, scene)).toMatch(/Klatschball|Ablage/);
  });
});
