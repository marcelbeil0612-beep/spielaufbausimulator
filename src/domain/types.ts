/**
 * Domain-Typen – reine Daten, keine Logik, keine Seiteneffekte.
 */

export type PitchCoord = {
  readonly x: number;
  readonly y: number;
};

export type RoleCode =
  | 'GK'
  | 'LB'
  | 'LCB'
  | 'RCB'
  | 'RB'
  | 'CDM'
  | 'LCM'
  | 'RCM'
  | 'CAM'
  | 'LM'
  | 'RM'
  | 'LW'
  | 'ST'
  | 'RW';

export type FormationPattern = '4-3-3' | '4-4-2' | '4-2-3-1';

export type TeamSide = 'home' | 'away';

/**
 * Slot einer Formation im Template-Koordinatensystem:
 *  - x ∈ [0, 100] : links (0) bis rechts (100) aus Sicht des eigenen Teams
 *  - y ∈ [0, 100] : eigenes Tor (0) bis gegnerisches Tor (100)
 */
export type PlayerSlot = {
  readonly role: RoleCode;
  readonly label: string;
  readonly position: PitchCoord;
};

export type Formation = {
  readonly pattern: FormationPattern;
  readonly description: string;
  readonly slots: readonly PlayerSlot[];
};

/**
 * Spieler im Welt-Koordinatensystem:
 *  - x ∈ [0, 100] : linke Seitenlinie (0) bis rechte (100)
 *  - y ∈ [0, 100] : Heim-Tor (0) bis Gast-Tor (100)
 */
export type Player = {
  readonly id: string;
  readonly role: RoleCode;
  readonly label: string;
  readonly position: PitchCoord;
};

export type Team = {
  readonly side: TeamSide;
  readonly formation: FormationPattern;
  readonly players: readonly Player[];
};
