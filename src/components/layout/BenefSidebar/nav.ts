// GUIC-706 — définition de la navigation bénéficiaire, hors du module client.
//
// La liste était déclarée dans le composant `'use client'` et filtrée au rendu à partir des
// clés masquées reçues en prop. React sérialisant les props des composants clients dans le
// HTML, chaque page annonçait les fonctionnalités cachées avec leurs identifiants internes —
// y compris pour un visiteur anonyme, sur l'accueil. Le filtrage est remonté au serveur, qui
// doit donc pouvoir importer la liste.

import type { IconName } from '@/components/ui/Icon'

export interface BenefSidebarItem {
  id: string
  href: string
  icon: IconName
  label: string
  /** Badge optionnel (count ou texte court). */
  badge?: string | number
  /** Badge muted (compteur indicatif) vs vif (alerte). */
  badgeMuted?: boolean
  /** Lien externe (ouvre dans un nouvel onglet, rendu avec <a> au lieu de <Link>). */
  external?: boolean
}
export interface BenefSidebarSection {
  title?: string
  items: BenefSidebarItem[]
}

export const SECTIONS_BENEF: BenefSidebarSection[] = [
  {
    items: [
      { id: 'home', href: '/jeune/tableau-de-bord', icon: 'home', label: 'Accueil' },
    ],
  },
  // GUIC-416 — conformité Lot 3 : la section Opportunités expose les
  // sous-types (Emploi & Stages, Bourses & Financement, Formations,
  // Concours & Appels) en raccourci, en plus de « Toutes » et
  // « Mes sauvegardes ». Les sous-items pointent vers /opportunites?type=…
  // (filtre serveur déjà géré par OpportunitesClient via searchParams).
  // Pas de badge count : compteur agrégé non disponible (cf. ticket).
  // GUIC-689 (Lot E4) — libellé aligné sur `web-dashboard.jsx:65` : « Mes
  // sauvegardes » (au lieu de « Mes favoris »). La route reste inchangée
  // (`/jeune/mes-favoris`).
  {
    title: 'Opportunités',
    items: [
      { id: 'opp-all', href: '/opportunites', icon: 'target', label: 'Toutes' },
      { id: 'opp-emploi', href: '/opportunites?type=Emploi', icon: 'employment', label: 'Emploi & Stages' },
      { id: 'opp-bourse', href: '/opportunites?type=Bourse', icon: 'funding', label: 'Bourses & Financement' },
      { id: 'opp-formation', href: '/opportunites?type=Formation', icon: 'learning', label: 'Formations' },
      { id: 'opp-concours', href: '/opportunites?type=Appel_a_projets', icon: 'trending', label: 'Concours & Appels' },
      { id: 'favoris', href: '/jeune/mes-favoris', icon: 'bookmark', label: 'Mes sauvegardes' },
    ],
  },
  // GUIC-689 (Lot E4) — ordre aligné sur `web-dashboard.jsx:60-78` pour les
  // items communs (candidatures / événements / ressources / centres /
  // messagerie). Les items additionnels propres à l'app (Mes formations,
  // Bibliothèque, absents de la v5) sont conservés en fin de section.
  {
    title: 'Mon parcours',
    items: [
      { id: 'candidatures', href: '/jeune/mes-candidatures', icon: 'document', label: 'Mes candidatures' },
      { id: 'agenda', href: '/agenda', icon: 'calendar', label: 'Événements & ateliers' },
      { id: 'ressources', href: '/ressources', icon: 'document', label: 'Ressources' },
      { id: 'centres', href: '/centres', icon: 'pin', label: 'Centres CJS' },
      { id: 'messagerie', href: '/jeune/messagerie', icon: 'chat', label: 'Messagerie' },
      { id: 'formations', href: '/jeune/mes-formations', icon: 'document', label: 'Mes formations' },
      { id: 'bibliotheque', href: '/jeune/bibliotheque', icon: 'resources', label: 'Bibliothèque' },
    ],
  },
  // GUIC-376 — "Mon compte > Mon profil" supprimé : la carte profil en haut
  // de la sidebar reste l'unique point d'accès à `/jeune/mon-profil` (pas
  // de doublon d'item de menu).
  // GUIC-658 — section « Plateformes partenaires » (YEAH, E-learning)
  // supprimée : sidebar épurée, le pied est réservé à l'accessibilité.
  // GUIC-689 (Lot E2) — `/jeune/parametres/notifications` existait sans
  // aucun lien de navigation pointant vers elle (page atteignable
  // uniquement en tapant l'URL). `/jeune/parametres` seul n'a pas de
  // page.tsx (404) — on câble donc l'URL réelle, dans une section « Mon
  // compte » minimale (conforme `web-dashboard.jsx:74-78`, sans réintroduire
  // « Mon profil » — cf GUIC-376 ci-dessus).
  {
    title: 'Mon compte',
    items: [
      { id: 'parametres', href: '/jeune/parametres/notifications', icon: 'settings', label: 'Paramètres' },
    ],
  },
]
