import { describe, it, expect } from 'vitest';
import type { Scene } from '@/domain/scene';
import { createInitialScene } from '@/domain/scene';
import { reactTo } from './reactTo';
import { evaluate, explainRating } from './evaluate';

function movePlayerBy(
  scene: Scene,
  awayIdx: number,
  toX: number,
  toY: number,
): Scene {
  return {
    ...scene,
    away: {
      ...scene.away,
      players: scene.away.players.map((p, i) =>
        i === awayIdx ? { ...p, position: { x: toX, y: toY } } : p,
      ),
    },
  };
}

describe('evaluate', () => {
  it('open: Startszene (Ball beim TW, kein Gegner in der Nähe)', () => {
    const scene = createInitialScene();
    expect(evaluate(scene)).toBe('open');
  });

  it('pressure: nach Pass auf LIV und Pressing-Reaktion (1 Gegner im Radius)', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB');
    if (!liv) throw new Error('LIV fehlt');
    const afterPass = { ...scene, ballHolderId: liv.id };
    const reacted = reactTo(afterPass);
    expect(evaluate(reacted)).toBe('pressure');
  });

  it('risky: 2 Gegner im PRESSURE_RADIUS', () => {
    const scene = createInitialScene();
    const holder = scene.home.players.find((p) => p.id === scene.ballHolderId)!;
    // Zwei Gegner nahe an den TW setzen (5 Einheiten entfernt).
    let s: Scene = movePlayerBy(scene, 0, holder.position.x + 5, holder.position.y);
    s = movePlayerBy(s, 1, holder.position.x - 5, holder.position.y);
    expect(evaluate(s)).toBe('risky');
  });

  it('risky: dirty Annahme trotz Startszene (0 Gegner im Radius)', () => {
    const scene = createInitialScene();
    const dirty: Scene = {
      ...scene,
      lastReception: { firstTouch: 'dirty', stance: 'closed' },
    };
    expect(evaluate(dirty)).toBe('risky');
  });

  it('risky: ungenauer Pass trotz Startszene', () => {
    const scene = createInitialScene();
    const imprecise: Scene = {
      ...scene,
      lastPass: { velocity: 'normal', accuracy: 'imprecise' },
    };
    expect(evaluate(imprecise)).toBe('risky');
  });

  it('loss-danger: 3 Gegner im PRESSURE_RADIUS', () => {
    const scene = createInitialScene();
    const holder = scene.home.players.find((p) => p.id === scene.ballHolderId)!;
    let s: Scene = movePlayerBy(scene, 0, holder.position.x + 5, holder.position.y);
    s = movePlayerBy(s, 1, holder.position.x - 5, holder.position.y);
    s = movePlayerBy(s, 2, holder.position.x, holder.position.y + 5);
    expect(evaluate(s)).toBe('loss-danger');
  });

  it('loss-danger: dirty Annahme + Gegner im Nahkontakt', () => {
    const scene = createInitialScene();
    const holder = scene.home.players.find((p) => p.id === scene.ballHolderId)!;
    const close = movePlayerBy(scene, 0, holder.position.x + 3, holder.position.y);
    const s: Scene = {
      ...close,
      lastReception: { firstTouch: 'dirty', stance: 'closed' },
    };
    expect(evaluate(s)).toBe('loss-danger');
  });

  it('loss-danger: scharfer Pass + dirty Annahme (ohne Nahkontakt)', () => {
    const scene = createInitialScene();
    const s: Scene = {
      ...scene,
      lastPass: { velocity: 'sharp', accuracy: 'neutral' },
      lastReception: { firstTouch: 'dirty', stance: 'closed' },
    };
    expect(evaluate(s)).toBe('loss-danger');
  });

  it('loss-danger: scharfer + ungenauer Pass unter Pressing (1 Gegner)', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB')!;
    const afterPass = { ...scene, ballHolderId: liv.id };
    const reacted = reactTo(afterPass);
    const s: Scene = {
      ...reacted,
      lastPass: { velocity: 'sharp', accuracy: 'imprecise' },
    };
    expect(evaluate(s)).toBe('loss-danger');
  });

  it('soft entschärft reinen Ungenauigkeits-Fehler ohne Druck', () => {
    const scene = createInitialScene();
    const s: Scene = {
      ...scene,
      lastPass: { velocity: 'soft', accuracy: 'imprecise' },
    };
    expect(evaluate(s)).toBe('open');
  });

  it('soft lässt dirty Annahme weiterhin risky (nicht entschärft)', () => {
    const scene = createInitialScene();
    const s: Scene = {
      ...scene,
      lastPass: { velocity: 'soft', accuracy: 'imprecise' },
      lastReception: { firstTouch: 'dirty', stance: 'closed' },
    };
    expect(evaluate(s)).toBe('risky');
  });

  it('loss-danger: geschlossene Stellung + dirty + 1 Presser (ohne Nahkontakt)', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB')!;
    const afterPass = { ...scene, ballHolderId: liv.id };
    const reacted = reactTo(afterPass);
    const s: Scene = {
      ...reacted,
      lastReception: { firstTouch: 'dirty', stance: 'closed' },
    };
    expect(evaluate(s)).toBe('loss-danger');
  });

  it('open Stance ohne Presser + dirty bleibt risky (Stance entschärft dirty nicht)', () => {
    const scene = createInitialScene();
    const s: Scene = {
      ...scene,
      lastReception: { firstTouch: 'dirty', stance: 'open' },
    };
    expect(evaluate(s)).toBe('risky');
  });

  it('open Stance entschärft Ungenauigkeit ohne Druck (analog soft)', () => {
    const scene = createInitialScene();
    const s: Scene = {
      ...scene,
      lastPass: { velocity: 'normal', accuracy: 'imprecise' },
      lastReception: { firstTouch: 'neutral', stance: 'open' },
    };
    expect(evaluate(s)).toBe('open');
  });

  it('open Stance entschärft Ungenauigkeit unter 1 Presser (bleibt pressure)', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB')!;
    const afterPass = { ...scene, ballHolderId: liv.id };
    const reacted = reactTo(afterPass);
    const s: Scene = {
      ...reacted,
      lastPass: { velocity: 'normal', accuracy: 'imprecise' },
      lastReception: { firstTouch: 'neutral', stance: 'open' },
    };
    expect(evaluate(s)).toBe('pressure');
  });

  it('lane blocker (passLane.blockers >= 1) eskaliert auf loss-danger', () => {
    const scene = createInitialScene();
    expect(
      evaluate(scene, { closest: 1, blockers: 1, threats: 0 }),
    ).toBe('loss-danger');
  });

  it('lane threat (passLane.threats >= 1) hebt offene Szene auf risky', () => {
    const scene = createInitialScene();
    expect(
      evaluate(scene, { closest: 5, blockers: 0, threats: 1 }),
    ).toBe('risky');
  });

  it('ohne passLane-Argument bleibt das bisherige Verhalten gleich', () => {
    const scene = createInitialScene();
    expect(evaluate(scene)).toBe('open');
  });

  it('lane blocker sticht sogar über stiller Pressing-Stufe', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB')!;
    const afterPass = { ...scene, ballHolderId: liv.id };
    const reacted = reactTo(afterPass);
    expect(
      evaluate(reacted, { closest: 1, blockers: 1, threats: 0 }),
    ).toBe('loss-danger');
  });

  it('open Stance entschärft Ungenauigkeit nicht bei 2+ Pressern', () => {
    const scene = createInitialScene();
    const holder = scene.home.players.find((p) => p.id === scene.ballHolderId)!;
    let s: Scene = movePlayerBy(scene, 0, holder.position.x + 5, holder.position.y);
    s = movePlayerBy(s, 1, holder.position.x - 5, holder.position.y);
    const withFlags: Scene = {
      ...s,
      lastPass: { velocity: 'normal', accuracy: 'imprecise' },
      lastReception: { firstTouch: 'neutral', stance: 'open' },
    };
    expect(evaluate(withFlags)).toBe('risky');
  });
});

describe('explainRating', () => {
  it('Startszene → open mit Code "open"', () => {
    const scene = createInitialScene();
    const r = explainRating(scene);
    expect(r.rating).toBe('open');
    expect(r.code).toBe('open');
    expect(r.reason).toMatch(/offen/i);
  });

  it('Passlinie abgefangen → Code "lane-blocked" schlägt alles andere', () => {
    const scene = createInitialScene();
    const r = explainRating(scene, { closest: 1, blockers: 1, threats: 0 });
    expect(r.rating).toBe('loss-danger');
    expect(r.code).toBe('lane-blocked');
  });

  it('Passlinie eingeengt → Code "lane-threatened" auf risky', () => {
    const scene = createInitialScene();
    const r = explainRating(scene, { closest: 5, blockers: 0, threats: 1 });
    expect(r.rating).toBe('risky');
    expect(r.code).toBe('lane-threatened');
  });

  it('dirty Annahme → Code "dirty" auf risky', () => {
    const scene = createInitialScene();
    const dirty: Scene = {
      ...scene,
      lastReception: { firstTouch: 'dirty', stance: 'closed' },
    };
    const r = explainRating(dirty);
    expect(r.rating).toBe('risky');
    expect(r.code).toBe('dirty');
  });

  it('Pressing nach Pass auf LIV → Code "one-presser" auf pressure', () => {
    const scene = createInitialScene();
    const liv = scene.home.players.find((p) => p.role === 'LCB')!;
    const afterPass = { ...scene, ballHolderId: liv.id };
    const reacted = reactTo(afterPass);
    const r = explainRating(reacted);
    expect(r.rating).toBe('pressure');
    expect(r.code).toBe('one-presser');
  });

  it('Priorität: loss-danger vor risky – sharp+dirty vor dirty-Code', () => {
    const scene = createInitialScene();
    const s: Scene = {
      ...scene,
      lastPass: { velocity: 'sharp', accuracy: 'neutral' },
      lastReception: { firstTouch: 'dirty', stance: 'closed' },
    };
    const r = explainRating(s);
    expect(r.rating).toBe('loss-danger');
    expect(r.code).toBe('sharp-dirty');
  });

  it('evaluate() bleibt ein Thin-Wrapper mit gleichem Rating wie explainRating()', () => {
    const scene = createInitialScene();
    expect(evaluate(scene)).toBe(explainRating(scene).rating);
  });

  it('Abseits: Empfänger jenseits der letzten Verteidigerlinie → loss-danger', () => {
    const scene = createInitialScene();
    const st = scene.home.players.find((p) => p.role === 'ST')!;
    // ST weit über die Abwehrlinie hinausschieben und als Ballträger setzen.
    const offsideScene: Scene = {
      ...scene,
      ballHolderId: st.id,
      home: {
        ...scene.home,
        players: scene.home.players.map((p) =>
          p.id === st.id ? { ...p, position: { x: 50, y: 95 } } : p,
        ),
      },
      lastPass: { velocity: 'normal', accuracy: 'neutral' },
      lastReception: { firstTouch: 'neutral', stance: 'open' },
    };
    const r = explainRating(offsideScene);
    expect(r.rating).toBe('loss-danger');
    expect(r.code).toBe('offside');
  });

  it('Lokale Überzahl entschärft das Rating um eine Stufe', () => {
    const scene = createInitialScene();
    const holder = scene.home.players.find((p) => p.id === scene.ballHolderId)!;
    // Einen Gegner künstlich in den Pressing-Radius + drei eigene Spieler
    // in unmittelbare Nähe zum Ballträger. ownNear − oppNear ≥ 3.
    const s: Scene = {
      ...scene,
      home: {
        ...scene.home,
        players: scene.home.players.map((p, i) => {
          if (p.id === holder.id || p.role === 'GK') return p;
          if (i < 4)
            return { ...p, position: { x: holder.position.x, y: holder.position.y + 1 } };
          return p;
        }),
      },
      away: {
        ...scene.away,
        players: scene.away.players.map((p, i) =>
          i === 0
            ? { ...p, position: { x: holder.position.x + 6, y: holder.position.y } }
            : { ...p, position: { x: 50, y: 80 } },
        ),
      },
    };
    const r = explainRating(s);
    // Ohne Überzahl wäre das Rating 'pressure' (1 Gegner im Radius).
    // Mit +3 Überzahl wird eine Stufe runter → 'open'.
    expect(r.rating).toBe('open');
    expect(r.reason).toMatch(/Überzahl/);
  });

  it('Lokale Unterzahl verschärft das Rating um eine Stufe', () => {
    const scene = createInitialScene();
    const holder = scene.home.players.find((p) => p.id === scene.ballHolderId)!;
    // Eigene Spieler weit weg, drei Feldspieler-Gegner rund um den
    // Ballträger: zwei im PRESSURE_RADIUS=12 (Basis 'risky'), ein dritter
    // im LOCAL_OVERLOAD_RADIUS=20 (sorgt für ownNear−oppNear=−3 ⇒
    // loss-danger). i=0 ist in 4-4-2 der gegnerische TW und wird im
    // Overload-Zähler ausgeschlossen, daher nach hinten gesetzt.
    const s: Scene = {
      ...scene,
      home: {
        ...scene.home,
        players: scene.home.players.map((p) =>
          p.id === holder.id || p.role === 'GK'
            ? p
            : { ...p, position: { x: 95, y: 95 } },
        ),
      },
      away: {
        ...scene.away,
        players: scene.away.players.map((p, i) =>
          i === 1
            ? { ...p, position: { x: holder.position.x + 6, y: holder.position.y + 3 } }
            : i === 2
              ? { ...p, position: { x: holder.position.x - 6, y: holder.position.y + 4 } }
              : i === 3
                ? { ...p, position: { x: holder.position.x + 14, y: holder.position.y + 5 } }
                : { ...p, position: { x: 50, y: 80 } },
        ),
      },
    };
    const r = explainRating(s);
    expect(r.rating).toBe('loss-danger');
    expect(r.reason).toMatch(/Unterzahl/);
  });

  it('Abseits-Signal feuert nicht ohne gespielten Pass (Startszene)', () => {
    const scene = createInitialScene();
    // ST jenseits der Linie, aber kein lastPass gesetzt → kein Abseits-Flag.
    const st = scene.home.players.find((p) => p.role === 'ST')!;
    const staged: Scene = {
      ...scene,
      ballHolderId: st.id,
      home: {
        ...scene.home,
        players: scene.home.players.map((p) =>
          p.id === st.id ? { ...p, position: { x: 50, y: 95 } } : p,
        ),
      },
    };
    const r = explainRating(staged);
    expect(r.code).not.toBe('offside');
  });
});
