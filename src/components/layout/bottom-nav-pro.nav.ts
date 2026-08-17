// GUIC-706 — définitions des bottom-navs professionnelles, hors des modules clients.
//
// Ces listes étaient déclarées dans les composants `'use client'` et filtrées au rendu à
// partir des clés masquées reçues en prop. React sérialisant les props des composants
// clients dans le HTML, chaque page annonçait les fonctionnalités cachées avec leurs
// identifiants internes. Le filtrage est remonté au serveur, qui doit donc pouvoir
// importer ces listes — impossible depuis un module client.
//
// Les composants n'en gardent que le type, effacé à la compilation.

import type { IconName } from '@/components/ui/Icon'

export interface BottomNavItem {
  href: string
  icon: IconName
  label: string
}

/** Les quatre premiers items ; le cinquième, « Plus », ouvre le sheet des secondaires. */
export const CONSEILLER_PRIMAIRES: readonly BottomNavItem[] = [
  { href: '/conseiller', icon: 'home', label: 'Accueil' },
  { href: '/conseiller/reservations', icon: 'calendar', label: 'Résa' },
  { href: '/conseiller/checkin', icon: 'target', label: 'Scan' },
  { href: '/conseiller/messagerie', icon: 'chat', label: 'Messages' },
]

export const CONSEILLER_SECONDAIRES: readonly BottomNavItem[] = [
  { href: '/conseiller/agenda', icon: 'clock', label: 'Agenda & RDV' },
  { href: '/conseiller/beneficiaires', icon: 'users', label: 'Bénéficiaires' },
  { href: '/conseiller/bibliotheque', icon: 'learning', label: 'Bibliothèque' },
  { href: '/conseiller/publications', icon: 'employment', label: 'Publications' },
  { href: '/conseiller/notifications', icon: 'bell', label: 'Notifications' },
  { href: '/conseiller/parametres', icon: 'settings', label: 'Paramètres' },
]

export const RECRUTEUR_PRIMAIRES: readonly BottomNavItem[] = [
  { href: '/recruteur/tableau-de-bord', icon: 'home', label: 'Accueil' },
  { href: '/recruteur/mes-offres', icon: 'employment', label: 'Offres' },
  { href: '/recruteur/candidatures', icon: 'target', label: 'Candidats' },
  { href: '/recruteur/messagerie', icon: 'chat', label: 'Messages' },
]

export const RECRUTEUR_SECONDAIRES: readonly BottomNavItem[] = [
  { href: '/recruteur/profil-entreprise', icon: 'users', label: 'Profil entreprise' },
  { href: '/recruteur/notifications', icon: 'bell', label: 'Notifications' },
  { href: '/recruteur/entretiens', icon: 'calendar', label: 'Entretiens' },
  { href: '/recruteur/parametres', icon: 'settings', label: 'Paramètres' },
]
