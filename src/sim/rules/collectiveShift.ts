import type { RoleCode } from '@/domain/types';
import type { Scene } from '@/domain/scene';
import { findPlayer } from '@/domain/scene';
import { maxShiftDistance } from '@/domain/physics';
import { anticipatedBallPos } from '@/domain/ballFlight';
import type { Player, PitchCoord } from '@/domain/types';
import type { ReactOptions } from '../reactTo';

type BlockFactors = {
  readonly lateral: number;
  readonly vertical: number;
  readonly squeeze: number;
};

type LineBand = 'front' | 'mid' | 'back';

const BLOCK_FACTORS: Record<Scene['pressIntensity'], BlockFactors> = {
  high: { lateral: 0.24, vertical: 0.28, squeeze: 0.08 },
  mid: { lateral: 0.17, vertical: 0.18, squeeze: 0.06 },
  low: { lateral: 0.1, vertical: 0.1, squeeze: 0.04 },
};

const LINE_FACTORS: Record<
  LineBand,
  { readonly lateral: number; readonly vertical: number; readonly squeeze: number }
> = {
  front: { lateral: 1.0, vertical: 1.0, squeeze: 0.7 },
  mid: { lateral: 0.92, vertical: 0.78, squeeze: 1.0 },
  back: { lateral: 0.78, vertical: 0.58, squeeze: 0.92 },
};

/**
 * Einfache Teamregel für kollektives Verschieben:
 *  - gesamter Block orientiert sich grob am Ball
 *  - ballnahe Spieler reagieren stärker als ballferne
 *  - Zentrum wird leicht verdichtet
 *  - Linien bleiben über band-spezifische Faktoren grob erhalten
 *
 * Ohne `dt` springt die Regel direkt ins Endbild. Mit `dt` wird die Bewegung
 * pro Spieler über die rollenspezifische Laufgeschwindigkeit gekappt.
 */
export function collectiveShift(scene: Scene, options?: ReactOptions): Scene {
  const holder = findPlayer(scene, scene.ballHolderId);
  if (!holder) return scene;

  const ballRef = currentBallReference(scene, holder.position);
  const attackerIsHome = scene.home.players.some((p) => p.id === holder.id);
  const opp = attackerIsHome ? scene.away : scene.home;
  const factors = BLOCK_FACTORS[scene.pressIntensity];

  let changed = false;
  const updatedPlayers = opp.players.map((player) => {
    if (player.role === 'GK') return player;
    const target = shiftedTarget(player, ballRef, factors);
    const next = capMoveTo(player, target, options);
    if (
      next.x !== player.position.x ||
      next.y !== player.position.y
    ) {
      changed = true;
    }
    return next.x === player.position.x && next.y === player.position.y
      ? player
      : { ...player, position: next };
  });

  if (!changed) return scene;

  return attackerIsHome
    ? { ...scene, away: { ...opp, players: updatedPlayers } }
    : { ...scene, home: { ...opp, players: updatedPlayers } };
}

function currentBallReference(scene: Scene, fallback: PitchCoord): PitchCoord {
  // Während eines Flugs antizipiert das verschiebende Team die Ballposition
  // (ballorientiertes Verschieben läuft dem Ball leicht voraus, nicht
  // hinterher). Beim Dribbling bleibt die aktuelle Ballposition Referenz.
  if (scene.ballFlight) {
    return anticipatedBallPos(scene.ballFlight, scene.ballPos);
  }
  if (scene.dribble) {
    return scene.ballPos;
  }
  return fallback;
}

function shiftedTarget(
  player: Player,
  ball: PitchCoord,
  factors: BlockFactors,
): PitchCoord {
  const line = LINE_FACTORS[lineBandFor(player.role)];
  const ballNearness = clamp(1 - Math.abs(player.position.x - ball.x) / 55, 0.35, 1);
  const sidePull =
    (ball.x - 50) * factors.lateral * line.lateral * ballNearness;
  const squeezePull = (50 - player.position.x) * factors.squeeze * line.squeeze;
  const verticalPull = (ball.y - 50) * factors.vertical * line.vertical;

  return {
    x: clamp(player.position.x + sidePull + squeezePull, 0, 100),
    y: clamp(player.position.y + verticalPull, 0, 100),
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
  const max = maxShiftDistance(options.dt, player.role);
  if (max >= dist) return target;
  if (max <= 0) return player.position;
  const k = max / dist;
  return {
    x: player.position.x + dx * k,
    y: player.position.y + dy * k,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
