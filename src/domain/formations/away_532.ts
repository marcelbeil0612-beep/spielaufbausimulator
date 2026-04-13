import type { Formation } from '../types';

/**
 * Gegner-Formation 5-3-2 (tiefer Block).
 * Fünferkette mit zwei Flügelverteidigern, zentrales Mittelfeld-Trio,
 * zwei Stürmer. Der mittlere Innenverteidiger wird (weil die
 * RoleCode-Palette keinen eigenen Slot hat) wie ein zweiter LCB geführt;
 * für die `getLines`-Auswertung reicht das, da alle fünf Spieler zur
 * Abwehrlinie zählen.
 */
export const FORMATION_5_3_2: Formation = {
  pattern: '5-3-2',
  description: '5-3-2 im tiefen Block',
  slots: [
    { role: 'GK', label: 'TW', position: { x: 50, y: 6 } },
    { role: 'LB', label: 'LWB', position: { x: 10, y: 22 } },
    { role: 'LCB', label: 'LIV', position: { x: 30, y: 16 } },
    { role: 'LCB', label: 'IVZ', position: { x: 50, y: 14 } },
    { role: 'RCB', label: 'RIV', position: { x: 70, y: 16 } },
    { role: 'RB', label: 'RWB', position: { x: 90, y: 22 } },
    { role: 'LCM', label: '8L', position: { x: 28, y: 46 } },
    { role: 'CDM', label: '6', position: { x: 50, y: 42 } },
    { role: 'RCM', label: '8R', position: { x: 72, y: 46 } },
    { role: 'ST', label: 'ST1', position: { x: 40, y: 72 } },
    { role: 'ST', label: 'ST2', position: { x: 60, y: 72 } },
  ],
};
