import { describe, it, expect } from 'vitest';
import { createInitialScene } from '@/domain/scene';
import type { Dribble } from '@/domain/dribble';
import { dribbleDuration } from '@/domain/dribble';
import type { Scene } from '@/domain/scene';
import { advanceDribble } from './advanceDribble';

function startDribble(scene: Scene, dy: number): Scene {
  const holder = scene.home.players.find((p) => p.id === scene.ballHolderId)!;
  const end = { x: holder.position.x, y: holder.position.y + dy };
  const duration = dribbleDuration(holder.position, end, 'jog');
  const dribble: Dribble = {
    playerId: holder.id,
    start: holder.position,
    end,
    speed: 'jog',
    duration,
    elapsed: 0,
    baseline: {
      homePlayers: scene.home.players,
      awayPlayers: scene.away.players,
    },
  };
  return { ...scene, dribble, ballPos: holder.position };
}

describe('advanceDribble', () => {
  it('bei elapsed 0 bleibt der Ballhalter an der Startposition', () => {
    const start = createInitialScene();
    const holder = start.home.players.find((p) => p.id === start.ballHolderId)!;
    const dribbling = startDribble(start, 20);
    const stepped = advanceDribble(dribbling, 0);
    expect(stepped.ballPos).toEqual(holder.position);
    const updated = stepped.home.players.find((p) => p.id === holder.id)!;
    expect(updated.position).toEqual(holder.position);
  });

  it('am Ende der Dauer steht der Ballhalter auf dem Ziel und dribble ist null', () => {
    const start = createInitialScene();
    const holder = start.home.players.find((p) => p.id === start.ballHolderId)!;
    const dribbling = startDribble(start, 20);
    const target = dribbling.dribble!.end;
    const done = advanceDribble(dribbling, dribbling.dribble!.duration);
    expect(done.dribble).toBeNull();
    const updated = done.home.players.find((p) => p.id === holder.id)!;
    expect(updated.position.x).toBeCloseTo(target.x, 5);
    expect(updated.position.y).toBeCloseTo(target.y, 5);
  });

  it('Verteidiger reagieren bei fortschreitendem Dribbling', () => {
    const start = createInitialScene();
    const dribbling = startDribble(start, 25);
    const done = advanceDribble(dribbling, dribbling.dribble!.duration);
    expect(done.away.players).not.toEqual(start.away.players);
  });
});
