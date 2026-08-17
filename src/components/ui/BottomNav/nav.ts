// GUIC-706 — définition de la bottom-nav bénéficiaire, hors du module client.
//
// La liste était déclarée dans le composant `'use client'` et filtrée au rendu à partir des
// clés masquées reçues en prop. React sérialisant les props des composants clients dans le
// HTML, chaque page annonçait les fonctionnalités cachées avec leurs identifiants internes —
// y compris pour un visiteur anonyme. Le filtrage est remonté au serveur, qui doit donc
// pouvoir importer la liste.

import type { IconName } from '@/components/ui/Icon'

export interface BottomNavItem {
  href: string
  icon: IconName
  label: string
}

/**
 * 5 onglets de la nav bénéficiaire mobile — signature v5 (GUIC-689 Lot E1).
 * Icônes issues du sprite SVG `public/icons.svg` — règle CLAUDE.md :
 * aucun emoji comme icône de nav.
 *
 * Conforme `design-guichet-v5/phone.jsx:181-185` (confirmé dans
 * `screens.jsx` et `mobile-flows.jsx`) : Accueil / Explorer / Candidatures /
 * Centres CJS / Profil.
 *
 * Décision produit (lead) : Agenda et Ressources quittent la bottom-nav au
 * profit de Candidatures et Profil — « Mes candidatures » est un parcours
 * central du produit qui n'était présent dans AUCUNE chrome persistante
 * mobile jusqu'ici (introuvable au doigt). Agenda/Ressources restent
 * accessibles via la sidebar desktop et les liens de contenu.
 *
 * Historique : item Profil retiré en v2 (cf ancienne note GUIC-205) puis
 * remplacé par Centres ; les deux coexistent désormais dans la signature v5
 * (5 colonnes toujours respectées).
 */
export const BOTTOM_NAV_ITEMS: readonly BottomNavItem[] = [
  { href: '/',                        icon: 'home',     label: 'Accueil' },
  { href: '/opportunites',            icon: 'search',   label: 'Explorer' },
  { href: '/jeune/mes-candidatures',  icon: 'document', label: 'Candidatures' },
  { href: '/centres',                 icon: 'pin',      label: 'Centres CJS' },
  { href: '/jeune/mon-profil',        icon: 'user',     label: 'Profil' },
]
