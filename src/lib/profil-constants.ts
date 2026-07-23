export const NIVEAU_ETUDE_OPTIONS = [
  { value: 'aucun',         label: 'Aucun diplôme'             },
  { value: 'primaire',      label: 'Primaire (CFEE)'           },
  { value: 'brevet',        label: 'Collège (BFEM)'            },
  { value: 'bac',           label: 'Baccalauréat'              },
  { value: 'bac+2',         label: 'Bac +2 (BTS / DUT)'        },
  { value: 'licence',       label: 'Licence (Bac +3)'          },
  { value: 'master',        label: 'Master (Bac +5)'           },
  { value: 'doctorat',      label: 'Doctorat'                  },
  { value: 'formation_pro', label: 'Formation professionnelle' },
] as const

export type NiveauEtudeValue = typeof NIVEAU_ETUDE_OPTIONS[number]['value']

export const SITUATION_EMPLOI_OPTIONS = [
  { value: 'sans_emploi',  label: 'Sans emploi'                    },
  { value: 'en_recherche', label: 'En recherche active'            },
  { value: 'employe',      label: 'Employé(e)'                     },
  { value: 'independant',  label: 'Indépendant / Auto-entrepreneur' },
  { value: 'etudiant',     label: 'Étudiant(e)'                    },
  { value: 'en_formation', label: 'En formation'                   },
  { value: 'stagiaire',    label: 'Stagiaire / Apprenti'           },
] as const

export type SituationEmploiValue = typeof SITUATION_EMPLOI_OPTIONS[number]['value']

export const DOMAINES_INTERET = [
  'Agriculture', 'Numérique', 'Commerce',  'Artisanat',  'Santé',
  'Éducation',   'BTP',       'Transport', 'Tourisme',   'Élevage',
  'Pêche',       'Environnement', 'Finance', 'Industrie', 'Mode & Textile',
] as const

export type DomaineInteret = typeof DOMAINES_INTERET[number]

export function niveauLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return NIVEAU_ETUDE_OPTIONS.find(o => o.value === value)?.label ?? value
}

export function situationLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return SITUATION_EMPLOI_OPTIONS.find(o => o.value === value)?.label ?? value
}

// GUIC-660 — situation de handicap (auto-déclarée, facultative). Aligné sur l'enum
// Prisma `Handicap`. « non_precise » = le jeune choisit de ne pas préciser.
export const HANDICAP_OPTIONS = [
  { value: 'aucun',       label: 'Aucun'                       },
  { value: 'moteur',      label: 'Moteur'                      },
  { value: 'visuel',      label: 'Visuel'                      },
  { value: 'auditif',     label: 'Auditif'                     },
  { value: 'autre',       label: 'Autre'                       },
  { value: 'non_precise', label: 'Je préfère ne pas préciser'  },
] as const

export type HandicapValue = typeof HANDICAP_OPTIONS[number]['value']

// GUIC-660 — zone d'habitation (auto-déclarée). Aligné sur l'enum Prisma `ZoneHabitation`.
export const ZONE_HABITATION_OPTIONS = [
  { value: 'rural',  label: 'Rural'  },
  { value: 'urbain', label: 'Urbain' },
] as const

export type ZoneHabitationValue = typeof ZONE_HABITATION_OPTIONS[number]['value']

export function handicapLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return HANDICAP_OPTIONS.find(o => o.value === value)?.label ?? value
}

export function zoneLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return ZONE_HABITATION_OPTIONS.find(o => o.value === value)?.label ?? value
}

export const MENTION_OPTIONS = [
  { value: 'passable',   label: 'Passable'   },
  { value: 'assez_bien', label: 'Assez bien' },
  { value: 'bien',       label: 'Bien'       },
  { value: 'tres_bien',  label: 'Très bien'  },
  { value: 'excellent',  label: 'Excellent'  },
] as const

export type MentionValue = typeof MENTION_OPTIONS[number]['value']

export function mentionLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return MENTION_OPTIONS.find(o => o.value === value)?.label ?? value
}
