import { notFound } from 'next/navigation'

/**
 * GUIC-706 — Cible de réécriture d'une fonctionnalité masquée en fermeture muette.
 *
 * Le middleware réécrit ici sans rediriger : l'URL demandée reste affichée et la réponse
 * est un 404 ordinaire, servi par `src/app/not-found.tsx`. Pour l'utilisateur, la route
 * n'existe pas — c'est l'exigence §2.2, une fonctionnalité masquée ne laisse aucune trace,
 * pas même la trace d'avoir été retirée.
 *
 * Appeler `notFound()` plutôt que de compter sur l'absence de route : une cible explicite
 * ne peut pas être cassée par un renommage, et une navigation directe vers `/masque`
 * répond 404 comme le reste — le dispositif ne s'expose pas lui-même.
 */
export default function Page(): never {
  notFound()
}
