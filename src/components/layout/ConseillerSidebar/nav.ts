// GUIC-706 — définition de la navigation conseiller, hors du module client.
//
// POURQUOI CE FICHIER EXISTE. La liste vivait dans le composant client, filtrée au rendu
// à partir des clés masquées reçues en prop. React sérialisant les props des composants
// clients dans le HTML, chaque page servie annonçait les fonctionnalités cachées avec
// leurs identifiants internes. Le filtrage est donc remonté au serveur, et pour qu'il
// puisse filtrer il doit pouvoir importer la liste — ce qu'il ne peut pas faire d'un
// module `'use client'`.
//
// Le composant client n'en garde que les TYPES, effacés à la compilation : rien de cette
// liste ne rejoint le bundle navigateur.

import type { IconName } from '@/components/ui/Icon'

export interface ConseillerNavItem {
  id: string
  href: string
  icon: IconName
  label: string
  badge?: number | null
}

export interface ConseillerNavSection {
  title?: string
  items: ConseillerNavItem[]
}

/** Badges dorés, résolus par le layout serveur. */
export interface ConseillerBadges {
  reservations?: number | null
  messages?: number | null
}

export function sectionsConseiller({
  reservations,
  messages,
}: ConseillerBadges = {}): ConseillerNavSection[] {
  return [
    { items: [{ id: 'home', href: '/conseiller', icon: 'home', label: 'Tableau de bord' }] },
    {
      title: 'Activité du centre',
      items: [
        { id: 'resa', href: '/conseiller/reservations', icon: 'calendar', label: 'Réservations', badge: reservations ?? null },
        { id: 'agenda', href: '/conseiller/agenda', icon: 'clock', label: 'Agenda & RDV' },
        { id: 'checkin', href: '/conseiller/checkin', icon: 'target', label: 'Check-in présence' },
        { id: 'messagerie', href: '/conseiller/messagerie', icon: 'chat', label: 'Messagerie', badge: messages ?? null },
      ],
    },
    {
      title: 'Gestion',
      items: [
        { id: 'benef', href: '/conseiller/beneficiaires', icon: 'users', label: 'Bénéficiaires' },
        { id: 'bibliotheque', href: '/conseiller/bibliotheque', icon: 'learning', label: 'Bibliothèque' },
        { id: 'publications', href: '/conseiller/publications', icon: 'employment', label: 'Publications' },
      ],
    },
    {
      title: 'Compte',
      items: [{ id: 'settings', href: '/conseiller/parametres', icon: 'settings', label: 'Paramètres' }],
    },
  ]
}
