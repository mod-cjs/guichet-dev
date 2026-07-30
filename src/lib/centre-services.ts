import type { CentreService } from '@prisma/client'

/**
 * Services proposés par un centre CJS (GUIC-687).
 * `value` = valeur canonique de l'enum Prisma (stockée) ; `label` = libellé FR affiché
 * (accents/espaces), aligné sur la maquette (console admin).
 * Littéraux (import de TYPE) plutôt que l'objet enum runtime : la valeur stockée EST le nom
 * d'enum, TS vérifie l'assignabilité, et on évite la dépendance à l'enum runtime (absent en
 * environnement de test Jest).
 */
export const CENTRE_SERVICES: ReadonlyArray<{ value: CentreService; label: string }> = [
  { value: 'WiFi', label: 'WiFi' },
  { value: 'Bibliotheque', label: 'Bibliothèque' },
  { value: 'Coworking', label: 'Coworking' },
  { value: 'Ateliers', label: 'Ateliers' },
  { value: 'Conseiller', label: 'Conseiller' },
  { value: 'Salle_reunion', label: 'Salle réunion' },
  { value: 'Postes_info', label: 'Postes info' },
  { value: 'Imprimante', label: 'Imprimante' },
  { value: 'Cafe', label: 'Café' },
  { value: 'Espace_detente', label: 'Espace détente' },
]

const LABELS: Record<string, string> = Object.fromEntries(
  CENTRE_SERVICES.map((s) => [s.value, s.label]),
)

/** Libellé FR d'un service (repli sur la valeur brute si inconnue). */
export function serviceLabel(value: string): string {
  return LABELS[value] ?? value
}
