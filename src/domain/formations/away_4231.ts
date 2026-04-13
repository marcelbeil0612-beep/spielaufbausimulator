import type { Formation } from '../types';

/**
 * Gegner-Formation 4-2-3-1 mit Doppelsechs und hängender Zehn.
 * Slot-Koordinaten im Template-Frame (eigenes Tor y=0, gegn. Tor y=100).
 */
export const FORMATION_4_2_3_1: Formation = {
  pattern: '4-2-3-1',
  description: '4-2-3-1 mit Doppelsechs und hängender Zehn',
  slots: [
    { role: 'GK', label: 'TW', position: { x: 50, y: 6 } },
    { role: 'LB', label: 'LV', position: { x: 15, y: 22 } },
    { role: 'LCB', label: 'LIV', position: { x: 38, y: 20 } },
    { role: 'RCB', label: 'RIV', position: { x: 62, y: 20 } },
    { role: 'RB', label: 'RV', position: { x: 85, y: 22 } },
    { role: 'CDM', label: '6L', position: { x: 40, y: 42 } },
    { role: 'CDM', label: '6R', position: { x: 60, y: 42 } },
    { role: 'LM', label: 'LM', position: { x: 18, y: 62 } },
    { role: 'CAM', label: '10', position: { x: 50, y: 60 } },
    { role: 'RM', label: 'RM', position: { x: 82, y: 62 } },
    { role: 'ST', label: 'ST', position: { x: 50, y: 80 } },
  ],
};
