import type { Formation } from './types';

export const FORMATION_4_3_3: Formation = {
  pattern: '4-3-3',
  description: '4-3-3 im Spielaufbau (einfache Sechs)',
  slots: [
    { role: 'GK', label: 'TW', position: { x: 50, y: 6 } },
    { role: 'LB', label: 'LV', position: { x: 12, y: 22 } },
    { role: 'LCB', label: 'LIV', position: { x: 36, y: 18 } },
    { role: 'RCB', label: 'RIV', position: { x: 64, y: 18 } },
    { role: 'RB', label: 'RV', position: { x: 88, y: 22 } },
    { role: 'CDM', label: '6', position: { x: 50, y: 38 } },
    { role: 'LCM', label: '8L', position: { x: 32, y: 52 } },
    { role: 'RCM', label: '8R', position: { x: 68, y: 52 } },
    { role: 'LW', label: 'LF', position: { x: 14, y: 76 } },
    { role: 'ST', label: 'ST', position: { x: 50, y: 82 } },
    { role: 'RW', label: 'RF', position: { x: 86, y: 76 } },
  ],
};

export const FORMATION_4_4_2: Formation = {
  pattern: '4-4-2',
  description: '4-4-2 im hohen Pressing',
  slots: [
    { role: 'GK', label: 'TW', position: { x: 50, y: 6 } },
    { role: 'LB', label: 'LV', position: { x: 15, y: 22 } },
    { role: 'LCB', label: 'LIV', position: { x: 38, y: 20 } },
    { role: 'RCB', label: 'RIV', position: { x: 62, y: 20 } },
    { role: 'RB', label: 'RV', position: { x: 85, y: 22 } },
    { role: 'LM', label: 'LM', position: { x: 16, y: 50 } },
    { role: 'LCM', label: '6', position: { x: 40, y: 48 } },
    { role: 'RCM', label: '8', position: { x: 60, y: 48 } },
    { role: 'RM', label: 'RM', position: { x: 84, y: 50 } },
    { role: 'ST', label: 'ST1', position: { x: 42, y: 72 } },
    { role: 'ST', label: 'ST2', position: { x: 58, y: 72 } },
  ],
};
