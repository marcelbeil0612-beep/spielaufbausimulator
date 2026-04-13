import { describe, it, expect } from 'vitest';
import { createInitialScene, findPlayer } from './scene';

describe('createInitialScene', () => {
  it('liefert 11 Heim- und 11 Gastspieler', () => {
    const scene = createInitialScene();
    expect(scene.home.players).toHaveLength(11);
    expect(scene.away.players).toHaveLength(11);
  });

  it('Ball liegt beim Torwart des Heimteams', () => {
    const scene = createInitialScene();
    const holder = findPlayer(scene, scene.ballHolderId);
    expect(holder?.role).toBe('GK');
    expect(scene.home.players.map((p) => p.id)).toContain(scene.ballHolderId);
  });

  it('Phase ist buildUp', () => {
    const scene = createInitialScene();
    expect(scene.phase).toBe('buildUp');
  });

  it('Heim-Formation ist 4-3-3, Gast-Formation ist 4-4-2', () => {
    const scene = createInitialScene();
    expect(scene.home.formation).toBe('4-3-3');
    expect(scene.away.formation).toBe('4-4-2');
  });

  it('lastPass startet als null', () => {
    const scene = createInitialScene();
    expect(scene.lastPass).toBeNull();
  });

  it('lastReception startet als null', () => {
    const scene = createInitialScene();
    expect(scene.lastReception).toBeNull();
  });
});

describe('findPlayer', () => {
  it('findet Spieler in beiden Teams', () => {
    const scene = createInitialScene();
    const homeId = scene.home.players[0].id;
    const awayId = scene.away.players[0].id;
    expect(findPlayer(scene, homeId)?.id).toBe(homeId);
    expect(findPlayer(scene, awayId)?.id).toBe(awayId);
  });

  it('liefert undefined für unbekannte ID', () => {
    const scene = createInitialScene();
    expect(findPlayer(scene, 'nope')).toBeUndefined();
  });
});
