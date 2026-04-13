import type { FormationPattern, RoleCode } from '@/domain/types';

/**
 * Formations-spezifische Rollenwahl für die Reaktions-Regeln.
 *  - `pressRoles`: Aus diesen Rollen stammt der Spieler, der den Ballträger
 *    attackiert. In den ST-lastigen Systemen ist das der nächste Stürmer.
 *    In der 4-2-3-1-Raute rückt stattdessen der ballnähere Sechser heraus.
 *  - `coverRoles`: Diese Rollen schieben Richtung Spielfeldmitte, um die
 *    zentralen Passlinien zu verstellen (ohne den aktiven Presser).
 */
export type FormationContext = {
  readonly pressRoles: readonly RoleCode[];
  readonly coverRoles: readonly RoleCode[];
};

const DEFAULT_CONTEXT: FormationContext = {
  pressRoles: ['ST'],
  coverRoles: ['ST'],
};

const CONTEXT_BY_FORMATION: Record<FormationPattern, FormationContext> = {
  '4-3-3': DEFAULT_CONTEXT,
  '4-4-2': DEFAULT_CONTEXT,
  '5-3-2': DEFAULT_CONTEXT,
  '4-2-3-1': {
    pressRoles: ['CDM'],
    coverRoles: ['CAM'],
  },
};

export function formationContextFor(
  pattern: FormationPattern,
): FormationContext {
  return CONTEXT_BY_FORMATION[pattern];
}
