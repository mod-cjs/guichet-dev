// GUIC-706 — listes de la navigation publique, pilotées par le catalogue.
//
// CE MODULE NE DOIT JAMAIS ÊTRE IMPORTÉ PAR UN COMPOSANT CLIENT. Les liens qu'il contient
// sont filtrés selon les fonctionnalités masquées ; les faire figurer dans le bundle
// navigateur permettrait de les comparer au rendu et d'en déduire ce qui est caché. Le
// composant reçoit la liste déjà filtrée en prop, et rien d'autre.
//
// La règle d'activité et les liens partenaires vivent dans `nav-partage.ts`, qui lui est
// client-safe.

import type { LienNav } from './nav-partage'

export const LIENS_PUBLICS: readonly LienNav[] = [
  { href: '/', label: 'Accueil', exact: true },
  { href: '/opportunites', label: 'Opportunités' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/ressources', label: 'Ressources' },
  { href: '/centres', label: 'Centres CJS' },
]

export const LIENS_CONNECTE: readonly LienNav[] = [
  { href: '/jeune/tableau-de-bord', label: 'Mon dashboard' },
  { href: '/jeune/mon-profil', label: 'Mon profil' },
]
