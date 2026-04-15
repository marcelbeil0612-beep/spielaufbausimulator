import type { Scene } from '@/domain/scene';
import { findPlayer } from '@/domain/scene';
import { getLines } from '@/domain/lines';
import { distance } from '@/domain/geometry';
import type { PitchCoord, Player } from '@/domain/types';
import { PRESSURE_RADIUS } from './evaluate';
import { assessMoveWindowInScene, PASS_WINDOW_LABELS } from './passWindow';
import {
  deriveReceiverCueHome,
  deriveReceiverFacingHome,
  toSvgCoord,
} from '@/ui/pitchGeometry';
import type { ReceiverCue } from '@/ui/pitchGeometry';
import type { FirstTouch } from '@/domain/reception';

export type SuggestedMoveCode = 'support_ball' | 'between_lines';

/**
 * Ein einzelner, didaktisch begründeter Vorschlag zur Anschlussbewegung
 * eines eigenen Mitspielers. Rein beschreibend; das Ausführen geschieht
 * in der State-Schicht über die bestehende `movePlayer`-Action.
 */
export type SuggestedMove = {
  readonly playerId: string;
  readonly from: PitchCoord;
  readonly to: PitchCoord;
  readonly code: SuggestedMoveCode;
  readonly title: string;
  readonly reason: string;
};

/**
 * Maximale Verschiebungsdistanz pro Vorschlag. Bewegungen sollen klein und
 * konservativ bleiben – keine Teleportation quer über das Feld.
 */
const MAX_STEP = 10;
const MIN_COORD = 5;
const MAX_COORD = 95;

const LABELS: Record<SuggestedMoveCode, { title: string; reason: string }> = {
  support_ball: {
    title: 'Unterstützung geben',
    reason: 'Kurze Anspielstation für den Ballhalter schaffen.',
  },
  between_lines: {
    title: 'Zwischen den Linien',
    reason: 'Freien Raum hinter dem Mittelfeld besetzen.',
  },
};

/**
 * Grund-Priorität je Heuristik. `support_ball` ist direkter und sofort
 * nutzbar; `between_lines` ist progressiver, aber situativer – deshalb
 * ein kleiner Score-Vorsprung für Unterstützung.
 */
const BASE_SCORE: Record<SuggestedMoveCode, number> = {
  support_ball: 60,
  between_lines: 55,
};

/**
 * Bewertet einen Vorschlag nach wenigen, klar erklärbaren Signalen:
 *  - Basis-Priorität aus `BASE_SCORE`.
 *  - Minus 2 × Bewegungsdistanz → kleine, konservative Moves bevorzugt.
 *  - +8, wenn `support_ball` nach dem Zug direkt anspielbar ist (≤ 12).
 *  - +5, wenn `between_lines` zentral (nahe Feldmitte) landet.
 *
 * Export für Test-Zwecke. Die UI sortiert nur noch das Array.
 */
export function scoreSuggestion(s: SuggestedMove, scene: Scene): number {
  const step = distance(s.from, s.to);
  let score = BASE_SCORE[s.code] - step * 2;
  const holder = findPlayer(scene, scene.ballHolderId);
  const context = deriveSuggestionContext(scene);
  if (holder) {
    if (s.code === 'support_ball') {
      const dAfter = distance(s.to, holder.position);
      if (dAfter <= 12) score += 8;
    }
    if (s.code === 'between_lines' && Math.abs(s.to.x - 50) < 8) {
      score += 5;
    }
  }
  if (context) {
    score += scoreCueBias(s.code, context);
  }
  return score;
}

/**
 * Didaktische Kurz-Begründung für die *beste* Empfehlung. Nutzt dieselben
 * Signale wie `scoreSuggestion` (Nähe zum Ballhalter für `support_ball`,
 * Zentralität für `between_lines`) – keine neue Heuristik, nur ein
 * situatives Satzmuster je Code. Bewusst zwei Varianten pro Code, damit
 * der Text spürbar zur Szene passt, ohne eine Textgenerator-Logik
 * aufzubauen.
 */
export function explainPrimarySuggestion(
  s: SuggestedMove,
  scene: Scene,
): string {
  const context = deriveSuggestionContext(scene);
  const window = assessMoveWindowInScene(scene, s.to);
  if (s.code === 'support_ball') {
    const holder = findPlayer(scene, scene.ballHolderId);
    const dAfter = holder ? distance(s.to, holder.position) : Infinity;
    if (context && context.firstTouch === 'dirty' && context.pressers >= 1) {
      return withWindowLabel(
        'Unter Druck eher auf Klatschball oder sichere Ablage – kurze Unterstützung hilft sofort.',
        window,
      );
    }
    if (
      context &&
      (context.cue.continuation === 'set' || context.cue.continuation === 'back')
    ) {
      return withWindowLabel(context.pressers >= 1 || context.firstTouch === 'dirty'
        ? 'Unter Druck eher auf Klatschball oder sichere Ablage – kurze Unterstützung hilft sofort.'
        : 'Der Empfänger steht eher auf Klatsch- oder Sicherheitsball – die kurze Stafette bleibt naheliegend.',
        window,
      );
    }
    if (dAfter <= 12) {
      return withWindowLabel(
        'Gibt dem Ballhalter sofort eine kurze, sichere Anspielstation.',
        window,
      );
    }
    return withWindowLabel(
      'Verkürzt den Abstand zum Ball und stabilisiert die Staffelung.',
      window,
    );
  }
  if (context?.cue.continuation === 'turn' && context.cue.bodyShape !== 'closed') {
    return withWindowLabel(
      'Der Empfänger ist eher offen zum Aufdrehen – der Raum zwischen den Linien wird direkt nutzbar.',
      window,
    );
  }
  if (context?.cue.continuation === 'carry_sideways') {
    return withWindowLabel(
      'Seitliches Mitnehmen liegt nahe – der Zwischenlinienraum bleibt als nächster Anschluss gut besetzt.',
      window,
    );
  }
  if (context?.cue.continuation === 'back' && context.pressers >= 1) {
    return withWindowLabel(
      'Unter Druck bleibt die sichere Staffelung wichtig – der Zwischenlinienraum hält die Folgeaktion trotzdem offen.',
      window,
    );
  }
  if (Math.abs(s.to.x - 50) < 8) {
    return withWindowLabel(
      'Besetzt zentral den Raum zwischen Mittelfeld und Abwehr – direkt progressiv.',
      window,
    );
  }
  return withWindowLabel(
    'Besetzt den freien Raum hinter dem gegnerischen Mittelfeld.',
    window,
  );
}

/**
 * Berechnet eine kleine Liste didaktisch begründeter Anschlussbewegungen
 * für das Heimteam (Angreifer im MVP). Aktuell zwei Heuristiken:
 *  - `between_lines`: zentraler Spieler in den Raum zwischen Mittelfeld-
 *    und Abwehrlinie des Gegners.
 *  - `support_ball`: passnaher Mitspieler rückt zur Stafette zum Ballhalter.
 *
 * Wenn eine Heuristik keinen sinnvollen Kandidaten findet, gibt sie `null`
 * zurück – lieber kein Vorschlag als ein beliebiger. Ein Spieler, der
 * schon für `between_lines` gewählt wurde, wird für `support_ball` nicht
 * mehr berücksichtigt (keine doppelte Idee auf demselben Spieler).
 */
export function suggestMoves(scene: Scene): readonly SuggestedMove[] {
  const holder = findPlayer(scene, scene.ballHolderId);
  if (!holder) return [];
  const attackerIsHome = scene.home.players.some((p) => p.id === holder.id);
  if (!attackerIsHome) return [];

  const candidates = scene.home.players.filter((p) => p.id !== holder.id);
  const suggestions: SuggestedMove[] = [];
  const used = new Set<string>();

  const bl = pickBetweenLines(scene, candidates, used);
  if (bl) {
    suggestions.push(bl);
    used.add(bl.playerId);
  }

  const sb = pickSupportBall(holder, candidates, used);
  if (sb) {
    suggestions.push(sb);
    used.add(sb.playerId);
  }

  // Stabile Reihenfolge: beste Empfehlung zuerst. Bei Gleichstand entscheidet
  // der ursprüngliche `BASE_SCORE`, damit die Reihenfolge deterministisch bleibt.
  return [...suggestions].sort((a, b) => {
    const diff = scoreSuggestion(b, scene) - scoreSuggestion(a, scene);
    if (diff !== 0) return diff;
    return BASE_SCORE[b.code] - BASE_SCORE[a.code];
  });
}

function pickBetweenLines(
  scene: Scene,
  candidates: readonly Player[],
  used: ReadonlySet<string>,
): SuggestedMove | null {
  const lines = getLines(scene.away);
  if (!Number.isFinite(lines.midfield) || !Number.isFinite(lines.defense)) {
    return null;
  }
  const targetY = (lines.midfield + lines.defense) / 2;
  // Zentral oder halbraumnah; noch tiefer als der Zwischenlinienraum,
  // damit die Bewegung echte Progression bringt.
  const eligible = candidates
    .filter((p) => !used.has(p.id))
    .filter((p) => Math.abs(p.position.x - 50) < 22)
    .filter((p) => p.position.y < targetY - 4);

  if (eligible.length === 0) return null;

  // Kleiner Schritt: den Spieler nehmen, der dem Zielraum am nächsten ist.
  const sorted = [...eligible].sort(
    (a, b) => Math.abs(a.position.y - targetY) - Math.abs(b.position.y - targetY),
  );
  const player = sorted[0]!;
  const to = clampStep(player.position, {
    x: clampCoord(player.position.x, 35, 65),
    y: targetY,
  });
  if (samePosition(player.position, to)) return null;
  return {
    playerId: player.id,
    from: player.position,
    to,
    code: 'between_lines',
    title: LABELS.between_lines.title,
    reason: LABELS.between_lines.reason,
  };
}

function pickSupportBall(
  holder: Player,
  candidates: readonly Player[],
  used: ReadonlySet<string>,
): SuggestedMove | null {
  // Spieler, die zu weit weg sind für eine kurze Stafette, aber nicht
  // schon am Ballhalter kleben und nicht am anderen Feldende stehen.
  const scored = candidates
    .filter((p) => !used.has(p.id))
    .map((p) => ({ player: p, d: distance(p.position, holder.position) }))
    .filter(({ d }) => d > 15 && d < 45)
    .sort((a, b) => a.d - b.d);

  if (scored.length === 0) return null;
  const { player, d } = scored[0]!;
  // Ziel: ~60 % des aktuellen Abstands näher ran, aber Mindestabstand 8
  // (niemand läuft dem Ballhalter in den Körper).
  const targetDist = Math.max(8, d * 0.6);
  const ratio = (d - targetDist) / d;
  const rawTo: PitchCoord = {
    x: player.position.x + (holder.position.x - player.position.x) * ratio,
    y: player.position.y + (holder.position.y - player.position.y) * ratio,
  };
  const to = clampStep(player.position, rawTo);
  if (samePosition(player.position, to)) return null;
  return {
    playerId: player.id,
    from: player.position,
    to,
    code: 'support_ball',
    title: LABELS.support_ball.title,
    reason: LABELS.support_ball.reason,
  };
}

function clampStep(from: PitchCoord, to: PitchCoord): PitchCoord {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  const scale = d > MAX_STEP ? MAX_STEP / d : 1;
  return {
    x: clampCoord(from.x + dx * scale, MIN_COORD, MAX_COORD),
    y: clampCoord(from.y + dy * scale, MIN_COORD, MAX_COORD),
  };
}

function clampCoord(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function samePosition(a: PitchCoord, b: PitchCoord): boolean {
  return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
}

type SuggestionContext = {
  readonly cue: ReceiverCue;
  readonly pressers: number;
  readonly firstTouch: FirstTouch;
};

function deriveSuggestionContext(scene: Scene): SuggestionContext | null {
  const holder = scene.home.players.find((p) => p.id === scene.ballHolderId);
  if (!holder || !scene.lastPass || !scene.lastReception) return null;
  const previous = scene.history[scene.history.length - 1];
  if (!previous) return null;
  const sender =
    previous.home.players.find((p) => p.id === previous.ballHolderId) ??
    previous.away.players.find((p) => p.id === previous.ballHolderId);
  if (!sender) return null;

  const receiverSvg = toSvgCoord(holder.position);
  const lateBallSvg = interpolateSvg(toSvgCoord(sender.position), receiverSvg, 0.8);
  const facing = deriveReceiverFacingHome(receiverSvg, lateBallSvg);
  const cue = deriveReceiverCueHome(facing, toSvgCoord(sender.position), receiverSvg);
  const pressers = scene.away.players.filter(
    (p) => distance(p.position, holder.position) <= PRESSURE_RADIUS,
  ).length;

  return {
    cue,
    pressers,
    firstTouch: scene.lastReception.firstTouch,
  };
}

function scoreCueBias(code: SuggestedMoveCode, context: SuggestionContext): number {
  const { cue, pressers, firstTouch } = context;
  if (code === 'between_lines') {
    let score = 0;
    if (cue.continuation === 'turn') score += 6;
    if (cue.continuation === 'carry_sideways') score += 4;
    if (cue.bodyShape === 'open') score += 2;
    if (cue.bodyShape === 'half_open') score += 1;
    if (cue.arrivalSide === 'back_foot') score += 2;
    if (firstTouch === 'dirty') score -= 2;
    if (pressers >= 2) score -= 2;
    return score;
  }

  let score = 0;
  if (cue.continuation === 'set') score += 6;
  if (cue.continuation === 'back') score += 5;
  if (cue.arrivalSide === 'front_foot') score += 2;
  if (firstTouch === 'dirty') score += 3;
  if (firstTouch === 'neutral') score += 1;
  if (pressers >= 1) score += 2;
  if (pressers >= 2) score += 2;
  return score;
}

function interpolateSvg(
  from: { readonly cx: number; readonly cy: number },
  to: { readonly cx: number; readonly cy: number },
  t: number,
): { cx: number; cy: number } {
  return {
    cx: from.cx + (to.cx - from.cx) * t,
    cy: from.cy + (to.cy - from.cy) * t,
  };
}

function withWindowLabel(base: string, window: ReturnType<typeof assessMoveWindowInScene>): string {
  if (!window) return base;
  return `${base} ${PASS_WINDOW_LABELS[window]}.`;
}
