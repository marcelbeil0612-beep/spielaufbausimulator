import type { Scene } from '@/domain/scene';
import { findPlayer } from '@/domain/scene';
import { maxShiftDistance } from '@/domain/physics';
import type { PitchCoord, Player, RoleCode } from '@/domain/types';
import { suggestMoves } from '../suggestMoves';
import type { ReactOptions } from '../reactTo';

type LineBand = 'back' | 'mid' | 'front';

const SUPPORT_SHIFT_FACTORS = {
  lateral: 0.12,
  vertical: 0.08,
  squeeze: 0.03,
  offer: 0.38,
} as const;

const LINE_FACTORS: Record<
  LineBand,
  { readonly lateral: number; readonly vertical: number }
> = {
  back: { lateral: 0.7, vertical: 0.45 },
  mid: { lateral: 0.95, vertical: 0.7 },
  front: { lateral: 1.0, vertical: 0.9 },
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

  let changed = false;
  const updatedPlayers = team.players.map((player) => {
    if (player.role === 'GK' || player.id === holder.id) return player;
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
  const line = LINE_FACTORS[lineBandFor(player.role)];
  const ballNearness = clamp(1 - Math.abs(player.position.x - ball.x) / 50, 0.4, 1);
  const sidePull =
    (ball.x - player.position.x) * SUPPORT_SHIFT_FACTORS.lateral * line.lateral * ballNearness;
  const verticalPull =
    (ball.y - player.position.y) * SUPPORT_SHIFT_FACTORS.vertical * line.vertical * ballNearness;
  const squeezePull = (50 - player.position.x) * SUPPORT_SHIFT_FACTORS.squeeze;

  return {
    x: clamp(player.position.x + sidePull + squeezePull, 0, 100),
    y: clamp(player.position.y + verticalPull, 0, 100),
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

function lineBandFor(role: RoleCode): LineBand {
  switch (role) {
    case 'LB':
    case 'LCB':
    case 'RCB':
    case 'RB':
      return 'back';
    case 'CDM':
    case 'LCM':
    case 'RCM':
    case 'LM':
    case 'RM':
      return 'mid';
    case 'CAM':
    case 'LW':
    case 'ST':
    case 'RW':
      return 'front';
    case 'GK':
      return 'back';
  }
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

