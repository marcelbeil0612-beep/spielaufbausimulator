import type { Scene } from '@/domain/scene';
import { findPlayer } from '@/domain/scene';
import { maxShiftDistance } from '@/domain/physics';
import type { PitchCoord, Player, RoleCode } from '@/domain/types';
import { suggestMoves } from '../suggestMoves';
import type { ReactOptions } from '../reactTo';

const SUPPORT_SHIFT_FACTORS = {
  lateral: 0.12,
  vertical: 0.08,
  squeeze: 0.03,
  offer: 0.38,
} as const;

/**
 * Rollen-spezifische Modulation der ballorientierten Mikro-Verschiebung.
 * Ersetzt die alte 3-Band-Logik (back/mid/front) durch eine Tabelle pro
 * Rolle. Lesart:
 *  - `lateral` skaliert das seitliche Mit-Atmen Richtung Ball.
 *  - `vertical` skaliert das Mit-Aufrücken / Mit-Tiefe-Geben.
 *
 * Klassifikation grob:
 *  - `hold`     : steht eher (IVs, Sechser positionstreu)
 *  - `breath`   : atmet mit (Achter, Außenverteidiger im Aufbau)
 *  - `runDeep`  : sucht aktiv Tiefe (Stürmer, Flügel, Zehner)
 */
const ROLE_SHIFT_FACTORS: Record<
  RoleCode,
  { readonly lateral: number; readonly vertical: number }
> = {
  GK: { lateral: 0, vertical: 0 },
  LCB: { lateral: 0.6, vertical: 0.4 },
  RCB: { lateral: 0.6, vertical: 0.4 },
  LB: { lateral: 0.85, vertical: 0.5 },
  RB: { lateral: 0.85, vertical: 0.5 },
  CDM: { lateral: 0.9, vertical: 0.55 },
  LCM: { lateral: 1.0, vertical: 0.85 },
  RCM: { lateral: 1.0, vertical: 0.85 },
  LM: { lateral: 0.95, vertical: 0.85 },
  RM: { lateral: 0.95, vertical: 0.85 },
  CAM: { lateral: 1.0, vertical: 1.0 },
  LW: { lateral: 1.0, vertical: 1.0 },
  RW: { lateral: 1.0, vertical: 1.0 },
  ST: { lateral: 0.7, vertical: 1.1 },
};

/**
 * Kleine Offensiv-MVP-Regel:
 *  - ballorientierte Mikro-Verschiebung des eigenen Blocks während des Passes
 *  - ballnahe Spieler reagieren etwas stärker
 *  - ein naheliegender Unterstützer darf sich leicht anbieten
 *
 * Bewusst nur während `ballFlight` aktiv. Dribblings und statische Szenen
 * bleiben unverändert, damit das Modell lesbar und kontrolliert bleibt.
 */
export function supportOwnPlay(scene: Scene, options?: ReactOptions): Scene {
  if (!scene.ballFlight) return scene;

  const holder = findPlayer(scene, scene.ballHolderId);
  if (!holder) return scene;

  const attackerIsHome = scene.home.players.some((p) => p.id === holder.id);
  const team = attackerIsHome ? scene.home : scene.away;
  const supportSuggestion = suggestMoves(
    attackerIsHome ? scene : mirroredHomePerspective(scene),
  ).find((move) => move.code === 'support_ball');

  const flight = scene.ballFlight;
  const progress =
    flight.travelDuration > 0 ? flight.elapsed / flight.travelDuration : 1;

  let changed = false;
  const updatedPlayers = team.players.map((player) => {
    if (player.role === 'GK') return player;
    if (player.id === holder.id) {
      // Empfänger geht dem Ball leicht entgegen (Lösebewegung), nur in der
      // ersten Flughälfte und auf max ~2 Einheiten begrenzt.
      const target = receiverApproachTarget(player, flight.start, progress);
      const next = capMoveTo(player, target, options);
      if (next.x !== player.position.x || next.y !== player.position.y) {
        changed = true;
        return { ...player, position: next };
      }
      return player;
    }
    if (player.id === flight.fromId) {
      // Pass-und-Geh: ehemaliger Sender rückt eine Idee Richtung Tor nach.
      const target = senderFollowUpTarget(player, attackerIsHome);
      const next = capMoveTo(player, target, options);
      if (next.x !== player.position.x || next.y !== player.position.y) {
        changed = true;
        return { ...player, position: next };
      }
      return player;
    }
    const target = shiftedTarget(player, scene.ballPos);
    const offeredTarget =
      supportSuggestion && supportSuggestion.playerId === player.id
        ? blendTowards(target, supportSuggestion.to, SUPPORT_SHIFT_FACTORS.offer)
        : target;
    const next = capMoveTo(player, offeredTarget, options);
    if (next.x !== player.position.x || next.y !== player.position.y) {
      changed = true;
      return { ...player, position: next };
    }
    return player;
  });

  if (!changed) return scene;

  return attackerIsHome
    ? { ...scene, home: { ...team, players: updatedPlayers } }
    : { ...scene, away: { ...team, players: updatedPlayers } };
}

function shiftedTarget(player: Player, ball: PitchCoord): PitchCoord {
  const role = ROLE_SHIFT_FACTORS[player.role];
  const ballNearness = clamp(1 - Math.abs(player.position.x - ball.x) / 50, 0.4, 1);
  // Restverteidigung: zentrale IVs halten ihre Höhe, wenn der Ball klar
  // vorne ist (ball.y > 50). Lateral wird gedämpft, vertikal abgeschaltet.
  const restDefender = isCentralBack(player.role) && ball.y > 50;
  const lateralScale = restDefender ? 0.5 : 1;
  const verticalScale = restDefender ? 0 : 1;
  const sidePull =
    (ball.x - player.position.x) *
    SUPPORT_SHIFT_FACTORS.lateral *
    role.lateral *
    ballNearness *
    lateralScale;
  const verticalPull =
    (ball.y - player.position.y) *
    SUPPORT_SHIFT_FACTORS.vertical *
    role.vertical *
    ballNearness *
    verticalScale;
  // Außenpositionen halten Breite – kein Sog Richtung Mitte.
  const squeezePull = isWidePlayer(player.role)
    ? 0
    : (50 - player.position.x) * SUPPORT_SHIFT_FACTORS.squeeze;

  return {
    x: clamp(player.position.x + sidePull + squeezePull, 0, 100),
    y: clamp(player.position.y + verticalPull, 0, 100),
  };
}

const RECEIVER_APPROACH_MAX = 2;
const RECEIVER_APPROACH_PROGRESS_END = 0.6;
const SENDER_FOLLOW_UP_DISTANCE = 3;

function senderFollowUpTarget(player: Player, attackerIsHome: boolean): PitchCoord {
  const direction = attackerIsHome ? 1 : -1;
  return {
    x: player.position.x,
    y: clamp(
      player.position.y + direction * SENDER_FOLLOW_UP_DISTANCE,
      0,
      100,
    ),
  };
}

function receiverApproachTarget(
  player: Player,
  passOrigin: PitchCoord,
  progress: number,
): PitchCoord {
  if (progress >= RECEIVER_APPROACH_PROGRESS_END) return player.position;
  const dx = passOrigin.x - player.position.x;
  const dy = passOrigin.y - player.position.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return player.position;
  const step = Math.min(RECEIVER_APPROACH_MAX, dist * 0.5);
  const k = step / dist;
  return {
    x: clamp(player.position.x + dx * k, 0, 100),
    y: clamp(player.position.y + dy * k, 0, 100),
  };
}

function blendTowards(from: PitchCoord, to: PitchCoord, factor: number): PitchCoord {
  return {
    x: from.x + (to.x - from.x) * factor,
    y: from.y + (to.y - from.y) * factor,
  };
}

function capMoveTo(
  player: Player,
  target: PitchCoord,
  options: ReactOptions | undefined,
): PitchCoord {
  if (options?.dt === undefined) return target;
  const dx = target.x - player.position.x;
  const dy = target.y - player.position.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return player.position;
  const max = maxShiftDistance(options.dt, player.role) * 0.55;
  if (max >= dist) return target;
  if (max <= 0) return player.position;
  const k = max / dist;
  return {
    x: player.position.x + dx * k,
    y: player.position.y + dy * k,
  };
}

const WIDE_ROLES: readonly RoleCode[] = ['LB', 'RB', 'LW', 'RW'];
const CENTRAL_BACK_ROLES: readonly RoleCode[] = ['LCB', 'RCB'];

function isWidePlayer(role: RoleCode): boolean {
  return WIDE_ROLES.includes(role);
}

function isCentralBack(role: RoleCode): boolean {
  return CENTRAL_BACK_ROLES.includes(role);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function mirroredHomePerspective(scene: Scene): Scene {
  return {
    ...scene,
    home: scene.away,
    away: scene.home,
  };
}

