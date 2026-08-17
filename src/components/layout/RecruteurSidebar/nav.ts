// GUIC-706 — définition de la navigation recruteur, hors du module client.
//
// La liste était déclarée dans le composant `'use client'` et filtrée au rendu à partir des
// clés masquées reçues en prop. React sérialisant les props des composants clients dans le
// HTML, chaque page annonçait les fonctionnalités cachées avec leurs identifiants internes.
// Le filtrage est remonté au serveur, qui doit donc pouvoir importer la liste.

import type { IconName } from '@/components/ui/Icon'

export interface RecruteurNavItem {
  id: string
  href: string
  icon: IconName
  label: string
  badge?: number | null
}

export interface RecruteurNavSection {
  title?: string
  items: RecruteurNavItem[]
}

/** Compteurs de navigation, résolus par le layout serveur. */
export interface RecruteurCompteurs {
  offres?: number | null
  candidatures?: number | null
  messages?: number | null
}

export function sectionsRecruteur({
  offres,
  candidatures,
  messages,
}: RecruteurCompteurs = {}): RecruteurNavSection[] {
  return [
    { items: [{ id: 'home', href: '/recruteur/tableau-de-bord', icon: 'home', label: 'Tableau de bord' }] },
    {
      title: 'Recrutement',
      items: [
        { id: 'offres', href: '/recruteur/mes-offres', icon: 'employment', label: 'Mes offres', badge: offres ?? null },
        { id: 'candidatures', href: '/recruteur/candidatures', icon: 'document', label: 'Candidatures', badge: candidatures ?? null },
        { id: 'entretiens', href: '/recruteur/entretiens', icon: 'calendar', label: 'Entretiens' },
        { id: 'modeles-emails', href: '/recruteur/modeles-emails', icon: 'resources', label: 'Modèles d’emails' },
        { id: 'messagerie', href: '/recruteur/messagerie', icon: 'chat', label: 'Messagerie', badge: messages ?? null },
      ],
    },
    {
      title: 'Entreprise',
      items: [
        { id: 'company', href: '/recruteur/profil-entreprise', icon: 'users', label: 'Profil entreprise' },
        { id: 'settings', href: '/recruteur/parametres', icon: 'settings', label: 'Paramètres' },
      ],
    },
  ]
}
